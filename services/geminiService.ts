import { GoogleGenAI } from "@google/genai";
import { AppMode, ImageSize, AspectRatio, BackgroundMode } from "../types";

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
  if (process.env.API_KEY) return true;
  return false;
};

/**
 * Helper to parse a Data URI into the format Gemini expects.
 */
const processImagePart = (dataUri: string) => {
  const match = dataUri.match(/^data:([a-zA-Z0-9\/+\-]+);base64,(.+)$/);

  if (match && match.length === 3) {
    return {
      inlineData: {
        mimeType: match[1],
        data: match[2]
      }
    };
  }

  const cleanData = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
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

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const results: string[] = [];

  // For AI Model consistency (Create Model mode), we store the face of the first result
  // UNLESS randomFace is enabled
  let generatedIdentityRef: string | null = null;

  // GLOBAL STYLE ENFORCEMENT
  const STYLE_GUIDE = `
    CRITICAL STYLE RULES:
    1. PHOTOREALISM ONLY: The output MUST be a high-quality Photograph (8K, Raw Photo, Cinematic Lighting, Depth of Field).
    2. NO ARTISTIC STYLES: Do NOT generate cartoons, anime, illustrations, paintings, or 3D renders.
    3. TEXTURE: Skin texture must be realistic (pores, smooth). Fabrics must have realistic weave/weight.
  `;

  for (let i = 0; i < config.numberOfImages; i++) {
    try {
      const parts: any[] = [];
      let promptText = "";

      const isBatchMode = config.numberOfImages > 1;
      const variationInstruction = isBatchMode
        ? `\nVARIATION INSTRUCTION (Image ${i + 1} of ${config.numberOfImages}): Change the camera angle or pose slightly to create a diverse set.`
        : "";

      // --- MODE LOGIC ---

      if (config.mode === AppMode.CREATIVE_POSE) {
        if (config.primaryImage) {
          parts.push(processImagePart(config.primaryImage));
        }

        promptText = `
          I have provided a SOURCE IMAGE (Image 1).
          
          TASK: Generate a Creative Studio Portrait based on Image 1.
          ${STYLE_GUIDE}
          
          SUBJECT LOGIC (CRITICAL):
          - Analyze Image 1.
          - STRICTLY PRESERVE the Subject's Face, Hair, Skin Tone, and Outfit from Image 1.
          - This is a RE-POSING task. Do not change the person's identity or clothes.
          
          POSE:
          - Create a NEW, creative, natural, and professional fashion pose (Variation #${i + 1}).
          - Do not simply copy the original pose. Make it dynamic.

          BACKGROUND:
          - PRESERVE the vibe/environment of Image 1 unless instructed otherwise.
          
          ${variationInstruction}
        `;

      } else if (config.mode === AppMode.VIRTUAL_TRY_ON) {

        if (config.primaryImage) parts.push(processImagePart(config.primaryImage));
        if (config.secondaryImage) parts.push(processImagePart(config.secondaryImage));

        promptText = `
          I have provided a TARGET PERSON (Image 1) and an OUTFIT REFERENCE (Image 2).
          
          TASK: Virtual Try-On.
          ${STYLE_GUIDE}
          - Dress the person from Image 1 in the outfit from Image 2.
          - Constraint: Keep the facial identity of Image 1 EXACTLY as is.
          
          POSE:
          ${config.flexibleMode || isBatchMode
            ? '- You may slightly adjust the subject\'s pose to make the outfit look better and ensure variety.'
            : '- You must strictly maintain the original body pose of Image 1.'}

          ${variationInstruction}
        `;

      } else if (config.mode === AppMode.CREATE_MODEL) {

        if (config.primaryImage) {
          parts.push(processImagePart(config.primaryImage));
        }

        // Handle Identity Consistency for Batch Generation
        if (generatedIdentityRef && !config.randomFace) {
          parts.push(processImagePart(generatedIdentityRef));
        }

        let faceInstruction = "";
        if (config.randomFace) {
          faceInstruction = "FACE: Generate a UNIQUE, distinct face for this image. Do not repeat previous faces.";
        } else if (generatedIdentityRef) {
          faceInstruction = "FACE: STRICTLY MATCH the facial identity of the Face Reference provided (primaryImage).";
        } else {
          faceInstruction = "FACE: Generate a beautiful, photorealistic Korean young girl model with smooth white skintone, hourglass body(medium breast, small waist).";
        }

        promptText = `
             GENERATE a photorealistic Young Korean Girl (Smooth White Skin, Black Hair, medium breast, small waist) with the exact outfit (primaryImage)
             POSE: Create a dynamic, professional fashion pose (Variation #${i + 1}). 
             ${faceInstruction}

            ${variationInstruction}
          `;
      } else if (config.mode === AppMode.COPY_CONCEPT) {
        if (config.secondaryImage) parts.push(processImagePart(config.secondaryImage)); // Image 1 (Concept)
        if (config.primaryImage) parts.push(processImagePart(config.primaryImage)); // Image 2 (Face)


        promptText = `
        I have provided a FACE IDENTITY SOURCE (Image 2) and a CONCEPT/OUTFIT REFERENCE (Image 1).

        TASK: High-Fidelity Identity Portrait using Concept Composition.

        1. IDENTITY & HEAD STRUCTURE (CRITICAL PRIORITY):
           - The generated subject MUST be instantly recognizable as the person in Image 2.
           - ***KEY INSTRUCTION***: Preserve not just the internal facial features (eyes, nose, mouth) but also the HEAD SHAPE (jawline, forehead width) and HAIRLINE of Image 2.
           - If Image 1 (Concept) does not have specific headwear (hat/helmet), prioritize using the HAIRSTYLE of Image 2 to maintain resemblance.
           - If Image 1 has headwear, place that headwear naturally onto the head structure of Image 2.

        2. CONCEPT & OUTFIT TRANSFER:
           - Extract the outfit, environment, and lighting mood from Image 1.
           - Apply this exact styling to the subject.

        3. POSE & COMPOSITION (MIMICRY WITH ADAPTATION):
           - BASE POSE: Follow the body pose and camera angle of Image 1 closely. This is the foundation.
           - ADAPTATION: You are allowed to make *micro-adjustments* to the pose (e.g., slight neck rotation, shoulder alignment) ONLY IF necessary to make the new head (Image 2) attach naturally to the body (Image 1).
           - Ensure the head size is proportional to the body (avoid "floating head" effect).

        4. BLENDING:
           - Match the lighting on the face/hair of Image 2 to the environment of Image 1.
           
        ${variationInstruction}
        `
      }

      // Append User Prompt
      if (config.userPrompt) {
        promptText += `\n\nUSER OVERRIDE INSTRUCTIONS: ${config.userPrompt}`;
      }

      // Add prompt as text part
      parts.push({ text: promptText });

      // Configure Image Options
      const imageConfig: any = {
        aspectRatio: config.aspectRatio,
      };

      if (config.modelName === 'gemini-3-pro-image-preview') {
        imageConfig.imageSize = config.size;
      }

      // Call API
      const response = await ai.models.generateContent({
        model: config.modelName,
        contents: { parts },
        config: {
          imageConfig: imageConfig
        }
      });

      // Extract Image
      let imageFound = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const base64Str = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const fullDataUrl = `data:${mimeType};base64,${base64Str}`;

            results.push(fullDataUrl);
            imageFound = true;

            // Progressive Rendering
            if (config.onImageGenerated) {
              config.onImageGenerated(fullDataUrl);
            }

            // If this is the first generated image and we are not in random mode, save it as identity ref for next iterations in the loop
            if (!generatedIdentityRef && !config.randomFace && config.mode === AppMode.CREATE_MODEL) {
              generatedIdentityRef = fullDataUrl;
            }
            break; // Found the image part
          }
        }
      }

      if (!imageFound) {
        // Log warning but continue to next image in batch
        console.warn(`Failed to generate image ${i + 1}. The model might have refused the request.`);
      }

    } catch (e) {
      // Log error but continue to next image in batch
      console.error(`Error generating image ${i + 1}:`, e);
    }
  }

  // Only throw if NO images were generated at all
  if (results.length === 0) {
    throw new Error("Failed to generate any images.");
  }

  return results;
};