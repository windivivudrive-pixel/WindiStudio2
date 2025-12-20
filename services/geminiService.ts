import { AppMode, AspectRatio, BackgroundMode } from "../types";
import { supabase } from "./supabaseClient";
import { CLOUDFLARE_WORKER_URL, isCloudflareConfigured, getGenerateImageUrl } from "../config/cloudflareConfig";
import { compressImageToMaxSize, getBase64Size } from "../utils/imageUtils";

// Maximum image size for Cloudflare Workers (3MB)
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;

/**
 * Compress image if it exceeds the maximum size for API calls
 */
const compressImageIfNeeded = async (imageData: string | null): Promise<string | null> => {
  if (!imageData) return null;

  // Skip if it's a URL (will be fetched by worker)
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    console.log(`[ImageSize] Skipping URL image`);
    return imageData;
  }

  const size = getBase64Size(imageData);
  const sizeMB = (size / 1024 / 1024).toFixed(2);
  console.log(`[ImageSize] ${sizeMB}MB (limit: 3MB)`);

  if (size > MAX_IMAGE_SIZE_BYTES) {
    console.log(`[ImageSize] Compressing...`);
    try {
      const compressed = await compressImageToMaxSize(imageData, MAX_IMAGE_SIZE_BYTES);
      const newSize = getBase64Size(compressed);
      console.log(`[ImageSize] Compressed to ${(newSize / 1024 / 1024).toFixed(2)}MB`);
      return compressed;
    } catch (e) {
      console.error("[ImageSize] Failed to compress:", e);
      return imageData; // Return original if compression fails
    }
  }
  return imageData;
};

/**
 * Ensures the user has selected a paid API key via the AI Studio UI.
 */
export const ensureApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
      return true;
    }
    return true;
  }
  // Fallback if local dev or not embedded in AI Studio, check process.env
  if (import.meta.env.VITE_GEMINI_API_KEY) return true;
  return false;
};

/**
 * Helper to fetch an image from a URL and convert it to a Base64 string.
 */
const fetchImageAsBase64 = async (url: string): Promise<{ mimeType: string; data: string }> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const match = base64data.match(/^data:([a-zA-Z0-9\/+\-]+);base64,(.+)$/);
        if (match && match.length === 3) {
          resolve({
            mimeType: match[1],
            data: match[2]
          });
        } else {
          reject(new Error("Failed to parse base64 data"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching image for base64 conversion:", error);
    throw error;
  }
};

/**
 * Helper to parse a Data URI or URL into the format Gemini expects.
 */
const processImagePart = async (dataUriOrUrl: string) => {
  // Check if it's a URL (http/https)
  if (dataUriOrUrl.startsWith('http://') || dataUriOrUrl.startsWith('https://')) {
    const { mimeType, data } = await fetchImageAsBase64(dataUriOrUrl);
    return {
      inlineData: {
        mimeType,
        data
      }
    };
  }

  // Handle Data URI
  const match = dataUriOrUrl.match(/^data:([a-zA-Z0-9\/+\-]+);base64,(.+)$/);

  if (match && match.length === 3) {
    return {
      inlineData: {
        mimeType: match[1],
        data: match[2]
      }
    };
  }

  // Fallback: assume it's raw base64 data if not a URL and not a Data URI
  const cleanData = dataUriOrUrl.includes(',') ? dataUriOrUrl.split(',')[1] : dataUriOrUrl;
  return {
    inlineData: {
      mimeType: 'image/png',
      data: cleanData
    }
  };
};

/**
 * Helper to get auth token for Cloudflare Worker requests
 */
const getAuthToken = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Call generate-image API (Cloudflare Worker or Supabase fallback)
 */
const callGenerateImageAPI = async (body: any): Promise<{ data: any; error: any }> => {
  // Use Cloudflare Worker if configured
  if (isCloudflareConfigured()) {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(getGenerateImageUrl(), {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: { message: data.error || `HTTP ${response.status}` } };
      }

      return { data, error: null };
    } catch (e: any) {
      console.error("Cloudflare Worker call failed:", e);
      return { data: null, error: { message: e.message || "Network error" } };
    }
  }

  // Fallback to Supabase function
  return await supabase.functions.invoke('generate-image', { body });
};

/**
 * Generates images based on the mode and inputs.
 */
export const generateStudioImage = async (
  config: {
    mode: AppMode,
    modelName: string,
    primaryImage: string | null,
    secondaryImage: string | null,
    userPrompt: string,
    aspectRatio: AspectRatio,
    faceReferences?: string[],
    conceptReferences?: string[],
    flexibleMode?: boolean,
    randomFace?: boolean,
    keepFace?: boolean,
    accessoryImages?: string[],
    backgroundImage?: string | null,
    numberOfImages: number,
    targetResolution?: '1K' | '2K' | '4K', // Optional resolution for Seedream
    onImageGenerated?: (url: string) => void // Callback for progressive rendering
  }
): Promise<string[]> => {

  // We now split the batch into individual requests to support progressive rendering
  // and error isolation (so one failure doesn't fail the whole batch).

  const promises = [];
  const results: string[] = [];

  // Compress images once before the loop (they're the same for all variations)
  const compressedPrimaryImage = await compressImageIfNeeded(config.primaryImage);
  const compressedSecondaryImage = await compressImageIfNeeded(config.secondaryImage);
  const compressedBackgroundImage = await compressImageIfNeeded(config.backgroundImage || null);

  // Compress accessory images if present
  let compressedAccessoryImages: string[] | undefined;
  if (config.accessoryImages && config.accessoryImages.length > 0) {
    compressedAccessoryImages = await Promise.all(
      config.accessoryImages.map(img => compressImageIfNeeded(img))
    ).then(results => results.filter((img): img is string => img !== null));
  }

  for (let i = 0; i < config.numberOfImages; i++) {
    const requestPromise = (async () => {
      try {
        const { data, error } = await callGenerateImageAPI({
          mode: config.mode,
          modelName: config.modelName,
          primaryImage: compressedPrimaryImage,
          secondaryImage: compressedSecondaryImage,
          userPrompt: config.userPrompt,
          aspectRatio: config.aspectRatio,
          flexibleMode: config.flexibleMode,
          randomFace: config.randomFace,
          keepFace: config.keepFace,
          accessoryImages: compressedAccessoryImages,
          backgroundImage: compressedBackgroundImage,
          numberOfImages: 1, // Request 1 image at a time
          variationIndex: i,
          totalBatchSize: config.numberOfImages,
          targetResolution: config.targetResolution
        });

        if (error) {
          console.error(`Error generating image ${i + 1}:`, error);
          // Check if it's a structured error from our backend
          if (error.context && error.context.response) {
            try {
              // Clone response before reading to avoid "body already consumed" error
              const responseClone = error.context.response.clone();
              const errorBody = await responseClone.json();
              console.log("Error body from edge function:", errorBody);
              if (errorBody && errorBody.message) {
                throw new Error(errorBody.message);
              }
              if (errorBody && errorBody.error) {
                throw new Error(errorBody.error);
              }
            } catch (e: any) {
              // If it's our custom error, rethrow
              if (e.message && (e.message.includes("IMAGE_") || e.message.includes("SAFETY") || e.message.includes("BLOCKED"))) {
                throw e;
              }
              // Otherwise ignore json parse error
              console.log("Could not parse error response:", e);
            }
          }
          throw new Error(error.message || "Failed to generate image");
        }

        // Check if data contains an error (edge function returned 200 but with error in body)
        if (data && data.error) {
          console.log("Error in response data:", data);
          throw new Error(data.message || data.error);
        }

        if (data && data.images && data.images.length > 0) {
          const imageUrl = data.images[0];
          results.push(imageUrl);
          if (config.onImageGenerated) {
            config.onImageGenerated(imageUrl);
          }
          return imageUrl;
        } else {
          throw new Error("No image returned");
        }
      } catch (err: any) {
        console.error(`Failed to generate image ${i + 1}:`, err);
        // Rethrow safety errors immediately to stop the process and alert the user
        const errorMsg = err.message || "";
        if (errorMsg.includes("SAFETY_VIOLATION") ||
          errorMsg.includes("IMAGE_CONTENT_BLOCKED") ||
          errorMsg.includes("CONTENT_BLOCKED") ||
          errorMsg.includes("IMAGE_OTHER") ||
          errorMsg.includes("IMAGE_SAFETY") ||
          errorMsg.includes("ACCOUNT_BANNED") ||
          errorMsg.includes("PROHIBITED") ||
          errorMsg.includes("blocked") ||
          errorMsg.includes("content")) {
          throw err;
        }
        // We don't rethrow other errors here to allow other images to succeed.
        // But if ALL fail, the caller might want to know.
        return null;
      }
    })();
    promises.push(requestPromise);
  }

  // Wait for all to finish (settled)
  await Promise.all(promises);

  if (results.length === 0) {
    throw new Error("Failed to generate any images. Please try again.");
  }

  return results;
};