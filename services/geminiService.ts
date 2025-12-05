import { AppMode, AspectRatio, BackgroundMode } from "../types";
import { supabase } from "./supabaseClient";

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
    accessoryImages?: string[],
    backgroundImage?: string | null,
    numberOfImages: number,
    targetResolution?: '2K' | '4K', // Optional resolution for upscale
    onImageGenerated?: (url: string) => void // Callback for progressive rendering
  }
): Promise<string[]> => {

  // We now split the batch into individual requests to support progressive rendering
  // and error isolation (so one failure doesn't fail the whole batch).

  const promises = [];
  const results: string[] = [];

  for (let i = 0; i < config.numberOfImages; i++) {
    const requestPromise = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: {
            mode: config.mode,
            modelName: config.modelName,
            primaryImage: config.primaryImage,
            secondaryImage: config.secondaryImage,
            userPrompt: config.userPrompt,
            aspectRatio: config.aspectRatio,
            flexibleMode: config.flexibleMode,
            randomFace: config.randomFace,
            accessoryImages: config.accessoryImages,
            backgroundImage: config.backgroundImage,
            numberOfImages: 1, // Request 1 image at a time
            variationIndex: i,
            totalBatchSize: config.numberOfImages,
            targetResolution: config.targetResolution
          }
        });

        if (error) {
          console.error(`Error generating image ${i + 1}:`, error);
          // Check if it's a structured error from our backend
          if (error.context && error.context.response) {
            try {
              const errorBody = await error.context.response.json();
              if (errorBody && errorBody.message) {
                throw new Error(errorBody.message);
              }
            } catch (e) {
              // ignore json parse error
            }
          }
          throw new Error(error.message || "Failed to generate image");
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