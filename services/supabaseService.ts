
import { supabase } from './supabaseClient';
import { HistoryItem, UserProfile, AppMode, Transaction, BrandingConfig, Category, LibraryImage } from '../types';
import { base64ToBlob, compressImage } from '../utils/imageUtils';
import { uploadToR2, deleteFromR2 } from './r2Service';

// --- AUTHENTICATION ---

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/?view=studio&tab=studio' // Redirect to studio after login
    }
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// --- PROFILE MANAGEMENT ---

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
};

const generatePaymentCode = () => {
  return 'USER' + Math.floor(10000 + Math.random() * 90000).toString();
};

export const createProfileIfNotExists = async (user: any) => {
  const existing = await getProfile(user.id);
  if (existing) return existing;

  const newProfile = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata.full_name || user.email?.split('@')[0],
    avatar_url: user.user_metadata.avatar_url,
    payment_code: generatePaymentCode(),
    credits: 10, // Default 10 Wpoint for new users
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(newProfile)
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    return null;
  }

  return data;
};

/* --- BRANDING FEATURE --- */

export const uploadImageToStorage = async (base64Data: string, fileName: string): Promise<string | null> => {
  try {
    // Convert Base64 to Blob
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();

    const bucketName = import.meta.env.VITE_SUPABASE_BUCKET || 'windi-images';

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading branding logo:', error);
      return null;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (e) {
    console.error("Upload failed:", e);
    return null;
  }
};

// updateProfileBranding removed in favor of saveBrandingToDb

export const updateUserCredits = async (userId: string, newBalance: number) => {
  if (userId === 'dev-user') return; // Mock update
  const { error } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId);

  if (error) console.error("Failed to update credits", error);
};

export const redeemPromoCode = async (code: string, userId: string, deviceId?: string, localToken?: string) => {
  console.log(`Attempting to redeem code: ${code} for user: ${userId}`);
  console.log(`Device ID: ${deviceId?.substring(0, 8)}..., Local Token: ${localToken?.substring(0, 8)}...`);

  if (userId === 'dev-user') {
    // Mock redemption for dev user
    if (code === 'TEST100') return { success: true, message: 'Mock Success! +100 Credits', new_balance: 10100, reward: 100 };
    return { success: false, message: 'Invalid Mock Code' };
  }

  try {
    // Call the new Edge Function that handles IP extraction
    const { data, error } = await supabase.functions.invoke('redeem-code', {
      body: {
        code,
        userId,
        deviceId: deviceId || null,
        localToken: localToken || null
      }
    });

    console.log("Redeem Response - Data:", data);
    console.log("Redeem Response - Error:", error);

    if (error) {
      console.error("Promo code error details:", error);
      return { success: false, message: `System Error: ${error.message}` };
    }

    return data; // Returns JSON object from Edge Function
  } catch (err) {
    console.error("Redeem error:", err);
    return { success: false, message: 'Có lỗi xảy ra, vui lòng thử lại' };
  }
};

// --- TRANSACTIONS ---

export const fetchTransactions = async (userId: string): Promise<Transaction[]> => {
  if (userId === 'dev-user') return []; // Mock transactions
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
  return data || [];
};

export const createTransaction = async (userId: string, amountVnd: number, credits: number, content: string, status: 'PENDING' | 'SUCCESS' = 'SUCCESS', bonusPercentage: number = 0) => {
  if (userId === 'dev-user') return { id: 99999 }; // Mock transaction creation

  let finalContent = content;
  if (bonusPercentage > 0) {
    finalContent += ` (Bonus +${bonusPercentage}%)`;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      amount_vnd: amountVnd,
      credits_added: credits,
      type: 'DEPOSIT',
      content: finalContent,
      status: status
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create transaction", error);
    return null;
  }
  return data;
};

// --- STORAGE & GENERATIONS ---

// uploadImageToStorage moved to top


export const saveGenerationToDb = async (
  userId: string,
  item: HistoryItem,
  cost: number,
  imageType: 'STANDARD' | 'PREMIUM' | 'SCALEX2' | 'SCALE2' | 'SCALE4' | 'S4.0' | 'S4.5'
) => {
  if (userId === 'dev-user') {
    return item; // Mock save, return item as is (images are already base64 or URLs)
  }

  const uploadedUrls: string[] = [];

  // 1. Upload Images (or use existing URLs)
  for (let i = 0; i < item.images.length; i++) {
    const imageData = item.images[i];
    const fileName = `${userId}/${item.timestamp}_${i}.png`; // Use .png for R2

    try {
      // Check if it's already a public URL (from Seedream/BytePlus) - don't re-upload
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        // It's already a URL - use directly (Seedream returns public URLs)
        uploadedUrls.push(imageData);
        console.log(`Image ${i} is already a URL, using directly`);
      } else {
        // It's base64 - upload to R2
        const res = await fetch(imageData);
        const blob = await res.blob();
        const publicUrl = await uploadToR2(blob, fileName, 'image/png');
        if (publicUrl) uploadedUrls.push(publicUrl);
      }
    } catch (e) {
      console.error("Failed to upload generation to R2", e);
    }
  }

  if (uploadedUrls.length === 0) {
    console.error("No images uploaded, skipping DB insert");
    return null;
  }

  // 2. Insert into 'generations' table
  // NOTE: Ensure your 'generations' table has 'mode' and 'model_name' columns
  const rowsToInsert = uploadedUrls.map(url => ({
    user_id: userId,
    image_url: url,
    prompt: item.prompt,
    image_type: imageType,
    cost_credits: Math.ceil(cost / uploadedUrls.length),
    status: 'SUCCESS',
    mode: item.mode,
    model_name: item.modelName,
  }));

  const { error } = await supabase
    .from('generations')
    .insert(rowsToInsert)
    .select(); // Select allows us to see what was returned

  if (error) {
    console.error('Error saving generation to DB:', error);
    // Even if DB save fails, we return the item with public URLs so the UI updates
    return {
      ...item,
      thumbnail: uploadedUrls[0],
      images: uploadedUrls
    };
  }

  return {
    ...item,
    thumbnail: uploadedUrls[0],
    images: uploadedUrls
  };
};

export const fetchHistoryFromDb = async (userId: string): Promise<HistoryItem[]> => {
  if (userId === 'dev-user') return []; // Mock history

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching history:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id.toString(),
    thumbnail: row.image_url,
    images: [row.image_url], // Database stores individual rows, grouping logic would be complex, so we treat each row as 1 item
    prompt: row.prompt,
    timestamp: new Date(row.created_at).getTime(),
    mode: row.mode || AppMode.CREATIVE_POSE,
    modelName: row.model_name || 'unknown',
    cost: row.cost_credits
  }));
};
/* --- BRANDING FEATURE START --- */
export const checkUserHasBranding = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('branding')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking branding:', error);
    return false;
  }

  return !!data;
};

export const fetchUserBranding = async (userId: string): Promise<{ branding_logo: string; branding_config: BrandingConfig } | null> => {
  const { data, error } = await supabase
    .from('branding')
    .select('branding_logo, branding_config')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching branding:', error);
    return null;
  }

  return data;
};

export const saveBrandingToDb = async (
  userId: string,
  brandingLogo: string | null,
  brandingConfig: BrandingConfig
) => {

  const { error } = await supabase
    .from('branding')
    .upsert({
      user_id: userId,
      branding_logo: brandingLogo,
      branding_config: brandingConfig
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error saving branding to DB:', error);
    return null;
  }

  return { brandingLogo, brandingConfig };
};

export const deleteHistoryFromDb = async (id: string) => {
  // 1. Get the record to find the image URL
  const { data: record, error: fetchError } = await supabase
    .from('generations')
    .select('image_url')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error("Failed to fetch record for deletion", fetchError);
    return;
  }

  if (record?.image_url) {
    // TODO: Implement R2 deletion if needed.
    // For now, we skip storage deletion for R2 items to avoid errors with Supabase Storage client.
    const isSupabaseUrl = record.image_url.includes('supabase.co');

    if (isSupabaseUrl) {
      // 2. Extract file path from Public URL
      // Format: .../storage/v1/object/public/{bucket}/{path}
      const bucketName = import.meta.env.VITE_SUPABASE_BUCKET || 'windi-images';
      // Split by bucket name to get the path relative to the bucket
      const urlParts = record.image_url.split(`/${bucketName}/`);

      if (urlParts.length > 1) {
        const filePath = urlParts[1]; // This should be "userId/filename.png"

        // 3. Delete from Storage
        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);

        if (storageError) {
          console.warn("Failed to delete image from storage", storageError);
        }
      }
    } else {
      // R2 Deletion Logic
      // Try to parse the URL to get the key
      try {
        const publicDomain = import.meta.env.VITE_R2_PUBLIC_DOMAIN;
        let filePath = '';

        if (publicDomain && record.image_url.includes(publicDomain)) {
          // If URL matches configured domain, strip domain
          const domain = publicDomain.replace(/\/$/, '');
          filePath = record.image_url.replace(`${domain}/`, '');
        } else {
          // Fallback: use URL parsing
          const url = new URL(record.image_url);
          filePath = url.pathname.substring(1); // Remove leading slash
        }

        if (filePath) {
          await deleteFromR2(filePath);
        }
      } catch (e) {
        console.warn("Failed to delete from R2", e);
      }
    }
  }

  // 4. Delete from DB
  const { error } = await supabase.from('generations').delete().eq('id', id);
  if (error) console.error("Failed to delete", error);
};

export const deleteGenerationsBulk = async (ids: string[]) => {
  // We process these sequentially to ensure R2 cleanup happens for each.
  // A more optimized approach would be to fetch all URLs first, then delete all from R2, then delete all from DB.
  // But reusing the existing logic is safer for now.

  let successCount = 0;
  let failCount = 0;

  for (const id of ids) {
    try {
      await deleteHistoryFromDb(id);
      successCount++;
    } catch (e) {
      console.error(`Failed to delete item ${id}`, e);
      failCount++;
    }
  }

  return { successCount, failCount };
};

/* --- LIBRARY & ADMIN FEATURES --- */

export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  return data || [];
};

export const createCategory = async (name: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }
  return data;
};



export const toggleGenerationFavorite = async (id: string, isFavorite: boolean, categoryId?: number) => {
  const updateData: any = { is_favorite: isFavorite };
  if (categoryId !== undefined) {
    updateData.category_id = categoryId;
  }

  const { error } = await supabase
    .from('generations')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
  return true;
};

// Replaces old fetchLibraryImages
export interface LibraryFilterOptions {
  onlyFavorites?: boolean;
  categoryId?: number;
  userId?: string;
  imageType?: string;
  daysAgo?: number;
  page?: number;
  limit?: number;
}

export const fetchProfiles = async (): Promise<{ id: string; email: string }[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .order('email');

  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  return data || [];
};

// Replaces old fetchLibraryImages
export const fetchLibraryImages = async (options: LibraryFilterOptions = {}): Promise<HistoryItem[]> => {
  const { onlyFavorites = true, categoryId, userId, imageType, daysAgo, page = 0, limit = 60 } = options;

  // We use the Edge Function 'get-gallery' for ALL global queries to bypass RLS.
  // This includes:
  // 1. "Discover" Mode (onlyFavorites = true) -> Publicly visible curated images
  // 2. "All Users" Mode (onlyFavorites = false) -> Admin only raw feed

  // Note: "My Library" (User's own images) could technically use this too if we filter by userId,
  // but direct DB query is also fine for own data. 
  // However, to keep it consistent and simple, we can use the Edge Function for everything 
  // OR use it just for the global views.

  // Let's use it for the global views (when we are NOT filtering by a specific userId that matches the auth user).
  // Since we don't have the auth user ID easily available here without an async call, 
  // we will assume that if this function is called for "Library/Discover" or "All Users", we want global data.

  try {
    const body = {
      page,
      limit,
      categoryId,
      userId,
      imageType,
      daysAgo,
      onlyFavorites // Pass this through. true = Discover, false = All Users
    };

    // Use Cloudflare Worker if configured
    const cloudflareUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
    if (cloudflareUrl) {
      const response = await fetch(`${cloudflareUrl}/get-gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.images || [];
    }

    // Fallback to Supabase function
    const { data, error } = await supabase.functions.invoke('get-gallery', { body });

    if (error) {
      console.error('Error fetching gallery:', error);
      return [];
    }

    return data.images || [];
  } catch (e) {
    console.error("Failed to invoke get-gallery:", e);
    return [];
  }
};

export const fetchImageById = async (id: string): Promise<HistoryItem | null> => {
  try {
    const body = { id };

    // Use Cloudflare Worker if configured
    const cloudflareUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
    if (cloudflareUrl) {
      const response = await fetch(`${cloudflareUrl}/get-gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const images = data.images || [];
      return images.length > 0 ? images[0] : null;
    }

    // Fallback to Supabase function
    const { data, error } = await supabase.functions.invoke('get-gallery', { body });

    if (error) {
      console.error('Error fetching image by ID:', error);
      return null;
    }

    const images = data.images || [];
    return images.length > 0 ? images[0] : null;
  } catch (e) {
    console.error("Failed to fetch image by ID:", e);
    return null;
  }
};

export const fetchAllUserGenerations = async (): Promise<HistoryItem[]> => {
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100); // Limit to recent 100 for performance

  if (error || !data) {
    console.error('Error fetching all user generations:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id.toString(),
    thumbnail: row.image_url,
    images: [row.image_url],
    prompt: row.prompt,
    timestamp: new Date(row.created_at).getTime(),
    mode: row.mode || AppMode.CREATIVE_POSE,
    modelName: row.model_name || 'unknown',
    cost: row.cost_credits,
    imageType: row.image_type
  }));
};

/* --- REFERENCE IMAGE FOR ADMIN --- */
export interface ReferenceImageInput {
  user_id: string;
  image_url: string;
  prompt?: string;
  image_type: string;
  category_id?: number;
  is_favorite: boolean;
}

export const createReferenceImage = async (input: ReferenceImageInput): Promise<boolean> => {
  const { data, error } = await supabase
    .from('generations')
    .insert({
      user_id: input.user_id,
      image_url: input.image_url,
      prompt: input.prompt || '',
      image_type: input.image_type,
      category_id: input.category_id,
      is_favorite: input.is_favorite,
      model_name: 'reference',
      cost_credits: 0,
      mode: 'reference'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating reference image:', error);
    return false;
  }

  console.log('Reference image created:', data);
  return true;
};
