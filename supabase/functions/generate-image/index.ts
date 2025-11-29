import { GoogleGenAI } from "@google/genai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- CONSTANTS & PROMPTS ---
const STYLE_GUIDE = `
CRITICAL STYLE RULES:
1. PHOTOREALISM ONLY: The output MUST be a high-quality Photograph (8K, Raw Photo, Cinematic Lighting, Depth of Field).
2. NO ARTISTIC STYLES: Do NOT generate cartoons, anime, illustrations, paintings, or 3D renders.
3. TEXTURE: Skin texture must be realistic (pores, smooth). Fabrics must have realistic weave/weight.
`;

// Helper to process image parts

const processImagePart = async (dataUriOrUrl: string) => {
    if (!dataUriOrUrl) return null;

    // Handle HTTP/HTTPS URLs (e.g., from Supabase Storage)
    if (dataUriOrUrl.startsWith('http')) {
        try {
            console.log(`Fetching image from URL: ${dataUriOrUrl}`);
            const response = await fetch(dataUriOrUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
            }
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            // Safer base64 conversion to avoid "Maximum call stack size exceeded"
            let binary = '';
            const bytes = new Uint8Array(arrayBuffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);

            console.log(`Successfully converted image to base64. Size: ${len} bytes`);

            return {
                inlineData: {
                    mimeType: blob.type || 'image/png',
                    data: base64
                }
            };
        } catch (e) {
            console.error("Failed to fetch/process image from URL:", dataUriOrUrl, e);
            throw new Error(`Failed to fetch/process image from URL: ${dataUriOrUrl}`);
        }
    }

    const match = dataUriOrUrl.match(/^data:([a-zA-Z0-9\/+\-]+);base64,(.+)$/);
    if (match && match.length === 3) {
        return {
            inlineData: {
                mimeType: match[1],
                data: match[2]
            }
        };
    }

    // Fallback for raw base64
    return {
        inlineData: {
            mimeType: 'image/png',
            data: dataUriOrUrl.replace(/^data:image\/\w+;base64,/, "")
        }
    };
};

Deno.serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const {
            mode,
            modelName,
            primaryImage,
            secondaryImage,
            userPrompt,
            aspectRatio,
            flexibleMode,
            randomFace,
            numberOfImages = 1
        } = await req.json();

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set in environment variables.");
        }

        const ai = new GoogleGenAI({ apiKey });
        const results: string[] = [];

        let generatedIdentityRef: string | null = null;
        const activeModel = "gemini-2.0-flash-exp";

        for (let i = 0; i < numberOfImages; i++) {
            const parts: any[] = [];
            let promptText = "";

            const isBatchMode = numberOfImages > 1;
            const variationInstruction = isBatchMode
                ? `\nVARIATION INSTRUCTION (Image ${i + 1} of ${numberOfImages}): Change the camera angle or pose slightly to create a diverse set.`
                : "";

            // --- MODE LOGIC ---
            if (mode === 'CREATIVE_POSE') {
                if (primaryImage) parts.push(await processImagePart(primaryImage));

                promptText = `
          I have provided a SOURCE IMAGE (Image 1).

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

            } else if (mode === 'VIRTUAL_TRY_ON') {
                if (primaryImage) parts.push(await processImagePart(primaryImage));
                if (secondaryImage) parts.push(await processImagePart(secondaryImage));

                promptText = `
          I have provided a TARGET PERSON (Image 1) and an OUTFIT REFERENCE (Image 2).
          
          TASK: Virtual Try-On.
          ${STYLE_GUIDE}
          - Dress the person from Image 1 in the outfit from Image 2.
          - Constraint: Keep the facial identity of Image 1 EXACTLY as is.
          
          POSE:
          ${flexibleMode || isBatchMode
                        ? '- You may slightly adjust the subject\'s pose to make the outfit look better and ensure variety.'
                        : '- You must strictly maintain the original body pose of Image 1.'}

          ${variationInstruction}
        `;

            } else if (mode === 'CREATE_MODEL') {
                if (primaryImage) parts.push(await processImagePart(primaryImage));

                if (generatedIdentityRef && !randomFace) {
                    parts.push(await processImagePart(generatedIdentityRef));
                }

                let faceInstruction = "";
                if (randomFace) {
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

            } else if (mode === 'COPY_CONCEPT') {
                if (secondaryImage) parts.push(await processImagePart(secondaryImage)); // Image 1 (Concept)
                if (primaryImage) parts.push(await processImagePart(primaryImage)); // Image 2 (Face)

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
        `;
            }

            // Append User Prompt
            if (userPrompt) {
                promptText += `\n\nUSER OVERRIDE INSTRUCTIONS: ${userPrompt}`;
            }

            // Enforce Aspect Ratio in Prompt
            if (aspectRatio) {
                promptText += `\n Aspect ratio ${aspectRatio}.`;
            }

            // Add the text prompt to the parts
            parts.push({ text: promptText });

            const imageConfig: any = {};
            if (aspectRatio) {
                imageConfig.aspectRatio = aspectRatio;
            }

            console.log(`Generating with config: Model=${modelName || activeModel}, AspectRatio=${aspectRatio}`);

            const response = await ai.models.generateContent({
                model: modelName || activeModel,
                contents: { parts },
                config: {
                    imageConfig: imageConfig
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        const base64Str = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        const fullDataUrl = `data:${mimeType};base64,${base64Str}`;

                        results.push(fullDataUrl);

                        if (!generatedIdentityRef && !randomFace && mode === 'CREATE_MODEL') {
                            generatedIdentityRef = fullDataUrl;
                        }
                        break;
                    }
                }
            }
        }

        if (results.length === 0) {
            throw new Error("Failed to generate any images.");
        }

        return new Response(
            JSON.stringify({ images: results }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

    } catch (error) {
        console.error("Edge Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});
