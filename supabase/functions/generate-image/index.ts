import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // --- AUTH & SAFETY CHECK ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let userId: string | null = null;

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
            accessoryImages,
            numberOfImages = 1, // Legacy support, but we will mostly use 1 per request now
            variationIndex = 0,
            totalBatchSize = 1
        } = await req.json();

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set in environment variables.");
        }

        const authHeader = req.headers.get('Authorization');

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: userError } = await supabase.auth.getUser(token);
            if (user) {
                userId = user.id;

                // Check if user is banned
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('banned, warning_count')
                    .eq('id', userId)
                    .single();

                if (profile?.banned) {
                    throw new Error("ACCOUNT_BANNED: Your account has been suspended due to repeated safety violations.");
                }
            }
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
        const activeModel = "gemini-2.5-flash-image";

        // --- UPSCALE LOGIC ---
        if (modelName === 'upscale-4k') {
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
                model: 'gemini-3-pro-image-preview',
                contents: {
                    parts: [
                        processedImage,
                        { text: "Upscale this image to 4K resolution. Maintain exact identity, pose, and details but significantly improve clarity, sharpness, and texture. Photorealistic output." }
                    ]
                },
                config: {
                    // @ts-ignore
                    imageConfig: {
                        imageSize: '2K',
                        aspectRatio: aspectRatio || '1:1'
                    },
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    ]
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
            } else {
                throw new Error("Upscaling returned no image data.");
            }
        }

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

        // Process Accessory Images
        if (accessoryImages && accessoryImages.length > 0) {
            console.log(`Processing ${accessoryImages.length} accessory images...`);
            for (let i = 0; i < accessoryImages.length; i++) {
                const accPart = await processImagePart(accessoryImages[i]);
                if (accPart) {
                    parts.push(accPart);
                    promptText += `\n\nACCESSORY REFERENCE (Image ${parts.length}): Incorporate the accessory shown in this image into the outfit naturally.`;
                }
            }
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
                imageConfig: imageConfig,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
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


        if (results.length === 0) {
            console.error("Gemini Response (Full):", JSON.stringify(response, null, 2));
            if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                console.error("Candidate 0 Finish Reason:", candidate.finishReason);
                console.error("Candidate 0 Safety Ratings:", JSON.stringify(candidate.safetyRatings, null, 2));

                // Check for safety block
                const reason = candidate.finishReason as any;
                if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT" || reason === "BLOCK_REASON_SAFETY" || reason === "IMAGE_OTHER") {
                    return new Response(
                        JSON.stringify({ error: "SAFETY_VIOLATION", message: "AI refused to generate this image. It may contain prohibited content or safety violations." }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            }
            throw new Error("Failed to generate any images. Check logs for details.");
        }

        return new Response(
            JSON.stringify({ images: results }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

    } catch (error: any) {
        console.error("Edge Function Error:", error);

        // --- SAFETY VIOLATION HANDLING ---
        // Check for safety-related errors (from library or our own checks)
        const isSafetyError =
            error.message?.includes("SAFETY") ||
            error.message?.includes("PROHIBITED_CONTENT") ||
            error.message?.includes("blocked") ||
            (error.response?.promptFeedback?.blockReason);

        if (isSafetyError && userId) {
            console.warn(`Safety violation detected for user ${userId}. Incrementing warning count.`);

            try {
                // Fetch current profile to get latest count
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('warning_count')
                    .eq('id', userId)
                    .single();

                const currentWarnings = (profile?.warning_count || 0) + 1;
                const shouldBan = currentWarnings > 3;

                await supabase
                    .from('profiles')
                    .update({
                        warning_count: currentWarnings,
                        banned: shouldBan
                    })
                    .eq('id', userId);

                if (shouldBan) {
                    console.error(`User ${userId} has been BANNED.`);
                    return new Response(
                        JSON.stringify({ error: "ACCOUNT_BANNED", message: "Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm chính sách an toàn nhiều lần." }),
                        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                } else {
                    const remaining = 3 - currentWarnings;
                    return new Response(
                        JSON.stringify({ error: "SAFETY_VIOLATION", message: `Bạn đang sử dụng hình ảnh quá nhạy cảm hoặc bạo lực. Vui lòng chọn ảnh khác. Sau ${remaining} lần vi phạm nữa tài khoản bạn sẽ bị khóa.` }),
                        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            } catch (dbError: any) {
                console.error("Failed to update user safety stats:", dbError);
                // If it was our custom error, rethrow it
                if (dbError.message && (dbError.message.includes("SAFETY_VIOLATION") || dbError.message.includes("ACCOUNT_BANNED"))) {
                    throw dbError;
                }
            }
        }

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});
