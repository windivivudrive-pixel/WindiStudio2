import { AppMode, ImageSize, AspectRatio, BackgroundMode } from "../types";
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
    size: ImageSize,
    aspectRatio: AspectRatio,
    faceReferences?: string[],
    conceptReferences?: string[],
    flexibleMode?: boolean,
    randomFace?: boolean,
    numberOfImages: number,
    onImageGenerated?: (url: string) => void // Callback for progressive rendering
  }
): Promise<string[]> => {

  // Call Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: {
      mode: config.mode,
      modelName: config.modelName,
      primaryImage: config.primaryImage,
      secondaryImage: config.secondaryImage,
      userPrompt: config.userPrompt,
      size: config.size,
      aspectRatio: config.aspectRatio,
      flexibleMode: config.flexibleMode,
      randomFace: config.randomFace,
      numberOfImages: config.numberOfImages
    }
  });

  if (error) {
    console.error("Supabase Function Error:", error);
    throw new Error(error.message || "Failed to generate image via Supabase Edge Function");
  }

  if (!data || !data.images) {
    throw new Error("No images returned from server");
  }

  // Handle progressive rendering callback if provided
  if (config.onImageGenerated && data.images) {
    data.images.forEach((img: string) => config.onImageGenerated!(img));
  }

  return data.images;
};