import { GoogleGenAI } from "@google/genai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- CONSTANTS & PROMPTS ---
const STYLE_GUIDE = `
CRITICAL STYLE RULES:
1. PHOTOREALISM ONLY: The output MUST be a high-quality Photograph.
2. Do NOT generate cartoons or 3D renders.
3. TEXTURE: Skin texture must be realistic (smooth). Fabrics must have realistic weave/weight.
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
            numberOfImages = 1, // Legacy support, but we will mostly use 1 per request now
            variationIndex = 0,
            totalBatchSize = 1
        } = await req.json();

        // --- BYTEPLUS (SEEDREAM) LOGIC ---
        // --- BYTEPLUS (SEEDREAM) LOGIC ---
        // if (modelName.includes("250828")) {

        //     const arkApiKey = Deno.env.get('ARK_API_KEY');
        //     if (!arkApiKey) throw new Error("ARK_API_KEY is missing.");

        //     // Build correct image array for Seedream
        //     const imageList: string[] = [];
        //     const idIndexMap: Record<string, number> = {};

        //     if (primaryImage) {
        //         console.log(`Primary Image format: ${primaryImage.substring(0, 50)}...`);
        //         idIndexMap["primary"] = imageList.length;
        //         imageList.push(primaryImage);
        //     }

        //     if (secondaryImage) {
        //         console.log(`Secondary Image format: ${secondaryImage.substring(0, 50)}...`);
        //         idIndexMap["secondary"] = imageList.length;
        //         imageList.push(secondaryImage);
        //     }

        //     console.log("Seedream Image Index Map:", idIndexMap);

        //     // Build prompt
        //     let finalPrompt = `${STYLE_GUIDE}\n${userPrompt || ""}`;

        //     finalPrompt = finalPrompt
        //         .replace(/<PRIMARY>/g, `image ${idIndexMap["primary"] + 1}`)
        //         .replace(/<SECONDARY>/g, `image ${idIndexMap["secondary"] + 1}`);

        //     if (mode === 'VIRTUAL_TRY_ON') {
        //         finalPrompt = `Replace the clothing and accessories in image 1 with the outfit of image 2 `
        //     }
        //     console.log("Seedream Final Prompt:", finalPrompt);

        //     // Call Seedream API
        //     const response = await fetch(
        //         "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations",
        //         {
        //             method: "POST",
        //             headers: {
        //                 "Content-Type": "application/json",
        //                 "Authorization": `Bearer ${arkApiKey}`,
        //             },
        //             body: JSON.stringify({
        //                 model: "seedream-4-0-250828",
        //                 prompt: finalPrompt,
        //                 image: imageList.length > 0 ? imageList : undefined,
        //                 sequential_image_generation: "auto",
        //                 sequential_image_generation_options: {
        //                     max_images: numberOfImages,
        //                 },
        //                 // steps: 40,                     // tăng bước → ảnh sắc hơn
        //                 // guidance_scale: 4,             // tăng độ bám prompt + chi tiết
        //                 // denoise: 0.25,                 // tái tạo chi tiết mịn hơn

        //                 // // Bộ creative enhance (tương đương nút Nâng cấp sáng tạo)
        //                 // enhance: {
        //                 //     detail: "high",            // tăng texture & chi tiết
        //                 //     sharpness: 0.4             // tăng độ nét giống UI
        //                 // },

        //                 // // Upscale sáng tạo (dreamina dùng cái này)
        //                 // upscale: {
        //                 //     enable: true,
        //                 //     factor: 4,                 // upscale x2 giống UI
        //                 //     mode: "creative"           // chính là “Nâng cấp sáng tạo”
        //                 // },

        //                 // // sampler ổn nhất cho Seedream 4.0
        //                 // sampler: "dpmpp_2m_karras",
        //                 steps: 40,
        //                 guidance_scale: 4.5,
        //                 denoise: 0.38,

        //                 enhance: {
        //                     detail: "extreme",
        //                     sharpness: 0.65
        //                 },

        //                 upscale: {
        //                     enable: true,
        //                     factor: 4,
        //                     mode: "creative-refine"   // QUAN TRỌNG —— giống 100% UI Dreamina
        //                 },

        //                 sampler: "dpmpp_2m_karras",

        //                 response_format: "url",
        //                 size: "4K",
        //                 stream: false,
        //                 watermark: false
        //             }),
        //         }
        //     );

        //     if (!response.ok) {
        //         const err = await response.text();
        //         throw new Error(`Seedream API Error: ${err}`);
        //     }

        //     const data = await response.json();
        //     console.log("Seedream Response:", data);

        //     const outputImages = data.data?.map((img: any) => img.url) || [];

        //     if (!outputImages.length)
        //         throw new Error("Seedream returned no images.");

        //     return new Response(
        //         JSON.stringify({ images: outputImages }),
        //         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        //     );
        // }

        if (modelName.includes("seededit")) {

            const arkApiKey = Deno.env.get("ARK_API_KEY");
            if (!arkApiKey) throw new Error("ARK_API_KEY is missing.");

            const imageList: string[] = [];

            if (primaryImage) imageList.push(primaryImage);
            if (secondaryImage) imageList.push(secondaryImage);

            if (imageList.length === 0)
                throw new Error("SeedEdit requires at least 1 image.");

            let finalPrompt = `${STYLE_GUIDE}\n${userPrompt || ""}`;
            finalPrompt = "";
            console.log("SeedEdit Final Prompt:", finalPrompt);

            const body = {
                model: "seededit-3-0-i2i-250628",
                prompt: finalPrompt,
                image: imageList,
                response_format: "url",
                size: "adaptive",
                guidance_scale: 5.5,
                watermark: false
            };

            const response = await fetch(
                "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${arkApiKey}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`SeedEdit API Error: ${err}`);
            }

            const data = await response.json();

            const outputImages =
                data.data?.map((img: any) => img.url || img.image_url).filter(Boolean) || [];

            return new Response(
                JSON.stringify({ images: outputImages }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }




        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set in environment variables.");
        }

        const ai = new GoogleGenAI({ apiKey });
        const results: string[] = [];

        // We now generate only 1 image per request to support progressive loading on frontend
        // The frontend will call this function N times.

        const i = variationIndex;
        const isBatchMode = totalBatchSize > 1;

        const variationInstruction = isBatchMode
            ? `\nVARIATION INSTRUCTION (Image ${i + 1} of ${totalBatchSize}): Change the camera angle or pose slightly to create a diverse set.`
            : "";

        const parts: any[] = [];
        let promptText = "";
        let generatedIdentityRef: string | null = null; // Note: This won't persist across requests. If needed, frontend must pass it back.
        const activeModel = "gemini-2.0-flash-exp";

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


        // --- UPSCALE LOGIC ---
        if (modelName === 'gemini-3-pro-image-preview') {
            const activeModel = 'gemini-3-pro-image-preview';
            console.log("Upscaling image with gemini-3-pro-image-preview (4K)...");

            if (!primaryImage) {
                throw new Error("Upscale requires an input image.");
            }

            // Process image (handles URL or Base64)
            const processedImage = await processImagePart(primaryImage);
            if (!processedImage) {
                throw new Error("Failed to process input image for upscale.");
            }

            // Use Gemini 3 Pro for High-Res Image-to-Image refinement
            const response = await ai.models.generateContent({
                model: "gemini-3-pro-image-preview",
                contents: {
                    parts: [
                        processedImage,
                        { text: "Upscale this image to 4K resolution. Maintain exact identity, pose, and details but significantly improve clarity, sharpness, and texture. Photorealistic output." }
                    ]
                },
                config: {
                    // @ts-ignore - imageSize might not be in types yet but supported by API
                    imageConfig: {
                        imageSize: '4K',
                        aspectRatio: aspectRatio || '1:1' // Default if missing
                    }
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        const base64Str = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        const fullDataUrl = `data:${mimeType};base64,${base64Str}`;
                        results.push(fullDataUrl);
                        break;
                    }
                }
            }

            if (results.length > 0) {
                return new Response(
                    JSON.stringify({ images: results }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
                );
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
