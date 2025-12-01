import { AppMode, AspectRatio, BackgroundMode } from "../types";
import { supabase } from "./supabaseClient";
import { base64ToBlob } from "../utils/imageUtils";
import { uploadToR2 } from "./r2Service";

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
      const errorText = await response.text();
      let errorMessage = `Edge Function returned a non-2xx status code: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = `Edge Function Error: ${errorJson.error}`;
        }
      } catch (e) {
        errorMessage += ` - ${errorText}`;
      }
      throw new Error(errorMessage);
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

// export const generateStudioImage = async (
//   config: {
//     mode: AppMode,
//     modelName: string,
//     primaryImage: string | null,
//     secondaryImage: string | null,
//     userPrompt: string,
//     aspectRatio: AspectRatio,
//     faceReferences?: string[],
//     conceptReferences?: string[],
//     flexibleMode?: boolean,
//     randomFace?: boolean,
//     numberOfImages: number,
//     onImageGenerated?: (url: string) => void
//   }
// ): Promise<string[]> => {

//   const results: string[] = [];
//   const promises = [];

//   for (let i = 0; i < config.numberOfImages; i++) {

//     const request = (async () => {
//       try {
//         const { data, error } = await supabase.functions.invoke("generate-image", {
//           body: {
//             ...config,
//             numberOfImages: 1,
//             variationIndex: i,
//             totalBatchSize: config.numberOfImages,
//           }
//         });

//         if (error) {
//           console.error(`❌ Error generating image ${i + 1}:`, error);
//           return null;
//         }

//         const payload = data?.images?.[0];
//         if (!payload) {
//           console.error("❌ No image returned");
//           return null;
//         }

//         // ============================
//         //         SEEDREAM MODE
//         // ============================
//         if (config.modelName.includes("250828")) {
//           // payload = direct URL (no base64)
//           results.push(payload);
//           config.onImageGenerated?.(payload);
//           return payload;
//         }

//         // ============================
//         //          GEMINI MODE
//         // ============================
//         if (config.modelName.includes("image")) {
//           // payload = base64 string
//           const base64 = payload;

//           const byteChars = atob(base64);
//           const byteNumbers = Array.from(byteChars).map(c => c.charCodeAt(0));
//           const byteArray = new Uint8Array(byteNumbers);

//           const blob = new Blob([byteArray], { type: "image/png" });
//           const blobUrl = URL.createObjectURL(blob);

//           results.push(blobUrl);
//           config.onImageGenerated?.(blobUrl);
//           return blobUrl;
//         }

//         console.error("❌ Unknown modelName:", config.modelName);
//         return null;

//       } catch (err) {
//         console.error(`❌ Failed request ${i + 1}:`, err);
//         return null;
//       }
//     })();

//     promises.push(request);
//   }

//   // Run all
//   await Promise.all(promises);

//   if (results.length === 0) {
//     throw new Error("Failed to generate any images.");
//   }

//   return results;
// };
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
    numberOfImages: number,
    onImageGenerated?: (url: string) => void // Callback for progressive rendering
  }
): Promise<string[]> => {

  // We now split the batch into individual requests to support progressive rendering
  // and error isolation (so one failure doesn't fail the whole batch).

  const promises = [];
  const results: string[] = [];

  // --- SEEDREAM PRE-PROCESSING (Upload to R2 if Base64) ---
  if (config.modelName.includes("250828")) {
    const timestamp = Date.now();

    if (config.primaryImage && config.primaryImage.startsWith('data:')) {
      console.log("Uploading Primary Image to R2...");
      const blob = await base64ToBlob(config.primaryImage);
      const fileName = `temp/seedream_p_${timestamp}.jpg`;
      const url = await uploadToR2(blob, fileName);
      if (url) {
        console.log("Primary Image uploaded:", url);
        config.primaryImage = url;
      }
    }

    if (config.secondaryImage && config.secondaryImage.startsWith('data:')) {
      console.log("Uploading Secondary Image to R2...");
      const blob = await base64ToBlob(config.secondaryImage);
      const fileName = `temp/seedream_s_${timestamp}.jpg`;
      const url = await uploadToR2(blob, fileName);
      if (url) {
        console.log("Secondary Image uploaded:", url);
        config.secondaryImage = url;
      }
    }
  }

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
            numberOfImages: 1, // Request 1 image at a time
            variationIndex: i,
            totalBatchSize: config.numberOfImages
          }
        });

        if (error) {
          console.error(`Error generating image ${i + 1}:`, error);
          let errorMsg = error.message || "Failed to generate image";
          if (error instanceof Error && 'context' in error) {
            // @ts-ignore
            const context = await error.context.json();
            if (context && context.error) {
              errorMsg = `Edge Function Error: ${context.error}`;
            }
          }
          throw new Error(errorMsg);
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
      } catch (err) {
        console.error(`Failed to generate image ${i + 1}:`, err);
        // We don't rethrow here to allow other images to succeed.
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