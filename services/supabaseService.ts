
import { supabase } from './supabaseClient';
import { HistoryItem, UserProfile, AppMode, Transaction } from '../types';
import { base64ToBlob } from '../utils/imageUtils';

// --- AUTHENTICATION ---

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
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
    credits: 300, // Default 30 Wpoint
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

export const updateUserCredits = async (userId: string, newBalance: number) => {
  const { error } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId);

  if (error) console.error("Failed to update credits", error);
};

// --- TRANSACTIONS ---

export const fetchTransactions = async (userId: string): Promise<Transaction[]> => {
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

export const createTransaction = async (userId: string, amountVnd: number, credits: number, content: string) => {
  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      amount_vnd: amountVnd,
      credits_added: credits,
      type: 'DEPOSIT',
      content: content,
      status: 'SUCCESS' // Simulating success
    });

  if (error) console.error("Failed to create transaction", error);
};

// --- STORAGE & GENERATIONS ---

export const uploadImageToStorage = async (base64Data: string, fileName: string): Promise<string | null> => {
  try {
    const blob = await base64ToBlob(base64Data);
    const { data, error } = await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_BUCKET || 'windi-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading image to bucket:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(import.meta.env.VITE_SUPABASE_BUCKET || 'windi-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err) {
    console.error('Upload exception:', err);
    return null;
  }
};

export const saveGenerationToDb = async (
  userId: string,
  item: HistoryItem,
  cost: number,
  imageType: 'STANDARD' | 'PREMIUM'
) => {
  const uploadedUrls: string[] = [];

  // 1. Upload Images
  for (let i = 0; i < item.images.length; i++) {
    const base64 = item.images[i];
    const fileName = `${userId}/${item.timestamp}_${i}.png`;
    const publicUrl = await uploadImageToStorage(base64, fileName);
    if (publicUrl) uploadedUrls.push(publicUrl);
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
  }

  // 4. Delete from DB
  const { error } = await supabase.from('generations').delete().eq('id', id);
  if (error) console.error("Failed to delete", error);
};
