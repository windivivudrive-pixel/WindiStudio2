/**
 * Windi Studio API - Cloudflare Workers
 * Handles: generate-image, get-gallery, proxy-image
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// R2Bucket interface for Cloudflare Workers
interface R2Bucket {
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: any): Promise<any>;
    get(key: string, options?: any): Promise<any>;
    delete(key: string): Promise<void>;
    list(options?: any): Promise<any>;
    head(key: string): Promise<any>;
}

// Environment interface
interface Env {
    GEMINI_API_KEY: string;
    BYTEPLUS_API_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    R2_BUCKET: R2Bucket;
    R2_PUBLIC_DOMAIN: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// --- CONSTANTS & PROMPTS ---
const STYLE_GUIDE = `
1. PHOTOREALISM ONLY: The output MUST be a high-quality fashion Photograph
2. Do NOT generate cartoons, anime, or 3D renders.
3. Skin texture must be realistic (pores, smooth). Fabrics must have realistic weave/weight.
`;

const BG_KEEPING = `
 BACKGROUND:
    - PRESERVE the vibe/environment of Image 1 unless instructed otherwise.
`;

const hairStyles = ["short bob hair", "brown hair", "high ponytail", "dyed hair", "shoulder-length straight hair"];
const faceShapes = ["round face", "diamond face shape", "sharp jawline", "heart-shaped face"];

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

            // Safer base64 conversion
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

// Type interfaces for request bodies
interface GenerateImageRequest {
    mode: string;
    modelName: string;
    primaryImage: string | null;
    secondaryImage: string | null;
    userPrompt: string;
    aspectRatio: string;
    flexibleMode?: boolean;
    randomFace?: boolean;
    keepFace?: boolean;
    accessoryImages?: string[];
    backgroundImage?: string | null;
    numberOfImages?: number;
    variationIndex?: number;
    totalBatchSize?: number;
    targetResolution?: '1K' | '2K' | '4K';
}

interface GalleryRequest {
    page?: number;
    limit?: number;
    categoryId?: number;
    userId?: string;
    imageType?: string;
    daysAgo?: number;
    onlyFavorites?: boolean;
    id?: string;
}

interface ProxyImageRequest {
    imageUrl: string;
}

// ============ GENERATE IMAGE HANDLER ============
async function handleGenerateImage(request: Request, env: Env): Promise<Response> {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    let userId: string | null = null;

    try {
        const body = await request.json() as GenerateImageRequest;
        const {
            mode,
            modelName,
            primaryImage,
            secondaryImage,
            userPrompt,
            aspectRatio,
            flexibleMode,
            randomFace,
            keepFace = true,
            accessoryImages,
            backgroundImage,
            numberOfImages = 1,
            variationIndex = 0,
            totalBatchSize = 1,
            targetResolution = '2K'
        } = body;

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not set in environment variables.");
        }

        const authHeader = request.headers.get('Authorization');

        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
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

        const i = variationIndex;
        const isBatchMode = totalBatchSize > 1;

        // Random features
        const randomHair = hairStyles[Math.floor(Math.random() * hairStyles.length)];
        const randomFaceShape = faceShapes[Math.floor(Math.random() * faceShapes.length)];

        let variationInstruction = "";

        // SPECIAL BATCH MODE (Set button = 4 images with different shot types)
        if (mode === "CREATIVE_POSE" && totalBatchSize === 4) {
            const shotTypes = [
                "WIDE SHOT (Toàn Cảnh): Show full body and a wider view of the environment.",
                "MEDIUM SHOT (Trung Cảnh - Knees Up): Focus on the outfit and pose, framing from around the knees up (American Shot).",
                "PORTRAIT SHOT (Bán Thân - Chest Up): Frame from the CHEST UP. Do NOT zoom in too tight on the face. Compose nicely with balanced headroom (avoid excessive empty space above).",
                "A perfect standard portrait (Waist Up / Mid-Shot). The model stands still with a natural, confident expression. Clean, sharp focus on the face. No motion blur. Lens: 85mm, Aperture: f/2.0 (Natural Human Vision Look)"
            ];

            variationInstruction = `
            \n--- BATCH VARIATION ${i + 1}/4 ---
            SHOT TYPE: ${shotTypes[i]}
            BACKGROUND DYNAMICS: Keep the original background VIBE/THEME (colors, location type) but RE-ARRANGE elements to make it lively and less boring. 
            Make the background feel like a dynamic, around the subject. If the background is like a studio or room, keep the lighting right.
          `;
        } else if (isBatchMode) {
            variationInstruction = `\n(Variation ${i + 1}): Change the camera angle or pose slightly to create a diverse set.`;
        }

        const parts: any[] = [];
        let promptText = "";
        let generatedIdentityRef: string | null = null;
        const activeModel = "gemini-2.5-flash-image";

        // --- UPSCALE LOGIC ---
        if (modelName === 'upscale-4k') {
            console.log("Upscaling image with pro (4K)...");

            if (!primaryImage) {
                throw new Error("Upscale requires an input image.");
            }

            const processedImage = await processImagePart(primaryImage);
            if (!processedImage) {
                throw new Error("Failed to process input image for upscale.");
            }

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
                        imageSize: targetResolution || '2K',
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

        // --- SEEDREAM 4.5: Early check for API key ---
        if (modelName === 'seedream-4-5') {
            const byteplusApiKey = env.BYTEPLUS_API_KEY;
            if (!byteplusApiKey) {
                throw new Error("BYTEPLUS_API_KEY is not set in environment variables.");
            }
        }

        // --- MODE LOGIC ---
        if (mode === 'CREATIVE_POSE') {
            if (primaryImage) parts.push(await processImagePart(primaryImage));

            let subjectInstruction = "";
            if (keepFace) {
                subjectInstruction = `
                 - STRICTLY PRESERVE the Subject's Face, Hair, Skin Tone, and Outfit from Image 1.
                 - This is a RE-POSING task. Do not change the person's identity or clothes.
                 - POSE:
                 - Create a NEW, creative, natural, and professional fashion pose (Variation #${i + 1}).
                 `;
            } else {
                subjectInstruction = `
                 - STRICTLY PRESERVE the Outfit from Image 1.
                 - CHANGE MODEL to a Vietnamese young model with ${randomHair} and${randomFaceShape}.
                 - POSE:
                 - Create a NEW, creative, natural, and professional fashion pose (Variation #${i + 1}).
                 `;
            }

            promptText = `

          ${STYLE_GUIDE}

          ${subjectInstruction}
          
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
             POSE: Create a fashion pose, full body Stand facing the camera slightly tilted to see outfit details(Variation #${i + 1}). 
             ${faceInstruction}
            ${variationInstruction}
          `;

        } else if (mode === 'COPY_CONCEPT') {
            if (secondaryImage) parts.push(await processImagePart(secondaryImage));
            if (primaryImage) parts.push(await processImagePart(primaryImage));

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
        } else if (mode === 'CREATIVE') {

            console.log("CREATIVE mode");
            // Process images if provided
            if (primaryImage) {
                parts.push(await processImagePart(primaryImage));
            }
            if (secondaryImage) {
                parts.push(await processImagePart(secondaryImage));
            }
            // Process accessory images for CREATIVE mode
            if (accessoryImages && accessoryImages.length > 0) {
                for (let j = 0; j < accessoryImages.length; j++) {
                    const accPart = await processImagePart(accessoryImages[j]);
                    if (accPart) {
                        parts.push(accPart);
                    }
                }
            }

            // CREATIVE mode: ONLY user's prompt + minimal photorealism rules
            promptText = `${userPrompt}`;

            // Skip all other prompt appending for CREATIVE mode
        }

        // Process Background Image (NOT for CREATIVE mode)
        if (mode !== 'CREATIVE' && backgroundImage) {
            console.log("Processing background image...");
            const bgPart = await processImagePart(backgroundImage);
            if (bgPart) {
                parts.push(bgPart);
                promptText += `\n\nBACKGROUND REFERENCE (Image ${parts.length}): PRESERVE the vibe/environment unless instructed otherwise.`;
            }
        }

        // Process Accessory Images (NOT for CREATIVE mode - already handled above)
        if (mode !== 'CREATIVE' && accessoryImages && accessoryImages.length > 0) {
            console.log(`Processing ${accessoryImages.length} accessory images...`);
            for (let j = 0; j < accessoryImages.length; j++) {
                const accPart = await processImagePart(accessoryImages[j]);
                if (accPart) {
                    parts.push(accPart);
                    promptText += `\nACCESSORY REFERENCE (Image ${parts.length}): Incorporate the accessory shown in this image into the outfit naturally.`;
                }
            }
            promptText += `\nBACKGROUND REFERENCE (Image ${parts.length}): PRESERVE the vibe/environment unless instructed otherwise.`;
        } else if (mode !== 'CREATIVE' && (mode !== 'CREATE_MODEL' || totalBatchSize !== 4)) {
            promptText += `${BG_KEEPING}`;
        }

        // Append User Prompt (NOT for CREATIVE mode - already included)
        if (mode !== 'CREATIVE' && userPrompt) {
            promptText += `\nUSER PROMPT: ${userPrompt}`;
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
        console.log(`=== FINAL PROMPT TEXT ===`);
        console.log(promptText);
        console.log(`=========================`);

        // --- SEEDREAM 4.0/4.5 API CALL (uses shared promptText) ---
        if (modelName === 'seedream-4-5' || modelName === 'seedream-4-0') {
            const seedreamModelId = modelName === 'seedream-4-5' ? 'seedream-4-5-251128' : 'seedream-4-0-250828';
            console.log(`Using BytePlus ${modelName} API (model: ${seedreamModelId}) with shared promptText...`);

            const byteplusApiKey = env.BYTEPLUS_API_KEY;

            // Helper: Convert URL to base64 DataURI
            const urlToBase64 = async (url: string): Promise<string> => {
                try {
                    console.log(`  Fetching image from URL: ${url.substring(0, 60)}...`);
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.error(`  Failed to fetch image: ${response.status}`);
                        return url; // Return original if fetch fails
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                    const contentType = response.headers.get('content-type') || 'image/jpeg';
                    const mimeType = contentType.split(';')[0].toLowerCase();
                    console.log(`  Converted to base64 DataURI (${mimeType}, ${Math.round(base64.length / 1024)}KB)`);
                    return `data:${mimeType};base64,${base64}`;
                } catch (error) {
                    console.error(`  Error converting URL to base64:`, error);
                    return url;
                }
            };

            // Collect and convert all images to base64
            const imageUrls: string[] = [];

            if (primaryImage) {
                if (primaryImage.startsWith('http')) {
                    imageUrls.push(await urlToBase64(primaryImage));
                } else if (primaryImage.startsWith('data:')) {
                    imageUrls.push(primaryImage);
                } else {
                    imageUrls.push(`data:image/jpeg;base64,${primaryImage}`);
                }
            }

            if (secondaryImage) {
                if (secondaryImage.startsWith('http')) {
                    imageUrls.push(await urlToBase64(secondaryImage));
                } else if (secondaryImage.startsWith('data:')) {
                    imageUrls.push(secondaryImage);
                } else {
                    imageUrls.push(`data:image/jpeg;base64,${secondaryImage}`);
                }
            }

            if (accessoryImages && accessoryImages.length > 0) {
                for (const accImg of accessoryImages) {
                    if (accImg.startsWith('http')) {
                        imageUrls.push(await urlToBase64(accImg));
                    } else if (accImg.startsWith('data:')) {
                        imageUrls.push(accImg);
                    } else {
                        imageUrls.push(`data:image/jpeg;base64,${accImg}`);
                    }
                }
            }

            if (backgroundImage) {
                if (backgroundImage.startsWith('http')) {
                    imageUrls.push(await urlToBase64(backgroundImage));
                } else if (backgroundImage.startsWith('data:')) {
                    imageUrls.push(backgroundImage);
                } else {
                    imageUrls.push(`data:image/jpeg;base64,${backgroundImage}`);
                }
            }

            // Build image role description for Seedream 4.5 multi-image blending
            let imageRolePrefix = "";
            let currentIdx = 1;

            if (imageUrls.length > 0) {
                if (mode === 'CREATIVE_POSE') {
                    if (primaryImage) {
                        imageRolePrefix += `Image ${currentIdx} is the SOURCE person with their outfit. Re-pose this person with a new creative pose while preserving their face, outfit, and identity. `;
                        currentIdx++;
                    }
                } else if (mode === 'VIRTUAL_TRY_ON') {
                    if (primaryImage) {
                        imageRolePrefix += `Image ${currentIdx} is the TARGET PERSON (keep this person's face and body). `;
                        currentIdx++;
                    }
                    if (secondaryImage) {
                        imageRolePrefix += `Image ${currentIdx} is the OUTFIT REFERENCE. Dress the person from Image 1 in this outfit. `;
                        currentIdx++;
                    }
                } else if (mode === 'CREATE_MODEL') {
                    if (primaryImage) {
                        imageRolePrefix += `Image ${currentIdx} is the OUTFIT REFERENCE. Generate a beautiful Korean model wearing this exact outfit. `;
                        currentIdx++;
                    }
                } else if (mode === 'COPY_CONCEPT') {
                    if (primaryImage) {
                        imageRolePrefix += `Image ${currentIdx} is the CONCEPT/OUTFIT REFERENCE (copy this style and outfit). `;
                        currentIdx++;
                    }
                    if (secondaryImage) {
                        imageRolePrefix += `Image ${currentIdx} is the FACE IDENTITY (use this person's face). Create a photo of this person wearing the outfit from Image 1. `;
                        currentIdx++;
                    }
                }

                // Add accessory references if present
                if (accessoryImages && accessoryImages.length > 0) {
                    for (let i = 0; i < accessoryImages.length; i++) {
                        imageRolePrefix += `Image ${currentIdx} is an ACCESSORY - incorporate this accessory naturally into the outfit. `;
                        currentIdx++;
                    }
                }

                // Add background reference if present
                if (backgroundImage) {
                    imageRolePrefix += `Image ${currentIdx} is the BACKGROUND/ENVIRONMENT REFERENCE - use this as the scene background. `;
                    currentIdx++;
                }
            }

            // Combine image role prefix with original promptText
            const seedreamPrompt = imageRolePrefix + promptText;

            // Build request body using enhanced prompt
            const requestBody: any = {
                model: seedreamModelId,
                prompt: seedreamPrompt,
                response_format: 'url',
                size: targetResolution || '2K',
                stream: false,
                watermark: false
            };

            // Add aspect ratio if specified
            if (aspectRatio) {
                requestBody.aspect_ratio = aspectRatio;
            }

            // Add image references - BytePlus uses "image" parameter as array for multi-image
            if (imageUrls.length >= 1) {
                requestBody.image = imageUrls; // Always use array format
            }

            // Debug: Log image formats being sent
            console.log(`Seedream 4.5 request: ${imageUrls.length} images`);
            for (let i = 0; i < imageUrls.length; i++) {
                const imgUrl = imageUrls[i];
                if (imgUrl.startsWith('http')) {
                    console.log(`  Image ${i + 1}: URL (${imgUrl.substring(0, 60)}...)`);
                } else if (imgUrl.startsWith('data:image/')) {
                    console.log(`  Image ${i + 1}: Base64 DataURI (${imgUrl.substring(0, 40)}...)`);
                } else {
                    console.log(`  Image ${i + 1}: Raw Base64 WITHOUT proper prefix (length: ${imgUrl.length})`);
                    // Fix: Add proper data URI prefix if missing
                    imageUrls[i] = `data:image/jpeg;base64,${imgUrl}`;
                    console.log(`  --> Fixed to: data:image/jpeg;base64,...`);
                }
            }

            // Re-assign fixed imageUrls to request body as array
            if (imageUrls.length >= 1) {
                requestBody.image = imageUrls;
            }

            console.log(`Seedream 4.5 prompt: ${seedreamPrompt.substring(0, 200)}...`);

            const response = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${byteplusApiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Seedream 4.5 API error:", response.status, errorText);
                throw new Error(`Seedream 4.5 API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json() as any;
            console.log("Seedream 4.5 response:", JSON.stringify(data, null, 2));

            // Extract image URL from response and upload to R2 for permanent storage
            // BytePlus URLs expire in 24 hours, so we need to save them to our R2
            if (data.data && data.data.length > 0) {
                for (let idx = 0; idx < data.data.length; idx++) {
                    const item = data.data[idx];
                    let imageUrl = '';

                    if (item.url) {
                        // Fetch the image from BytePlus and upload to R2
                        try {
                            console.log(`Fetching Seedream image from: ${item.url.substring(0, 60)}...`);
                            const imgResponse = await fetch(item.url);
                            if (imgResponse.ok) {
                                const arrayBuffer = await imgResponse.arrayBuffer();
                                const fileName = `seedream/${Date.now()}_${idx}.png`;

                                // Upload to R2 if bucket is available
                                if (env.R2_BUCKET) {
                                    await env.R2_BUCKET.put(fileName, arrayBuffer, {
                                        httpMetadata: { contentType: 'image/png' }
                                    });
                                    imageUrl = `${env.R2_PUBLIC_DOMAIN}/${fileName}`;
                                    console.log(`Uploaded to R2: ${imageUrl}`);
                                } else {
                                    // Fallback to original URL (will expire in 24h)
                                    console.warn("R2 bucket not configured, using original URL");
                                    imageUrl = item.url;
                                }
                            } else {
                                imageUrl = item.url; // Fallback
                            }
                        } catch (e) {
                            console.error("Failed to upload to R2:", e);
                            imageUrl = item.url; // Fallback to original URL
                        }
                    } else if (item.b64_json) {
                        // Base64 - upload to R2 directly
                        try {
                            const binaryString = atob(item.b64_json);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const fileName = `seedream/${Date.now()}_${idx}.png`;

                            if (env.R2_BUCKET) {
                                await env.R2_BUCKET.put(fileName, bytes, {
                                    httpMetadata: { contentType: 'image/png' }
                                });
                                imageUrl = `${env.R2_PUBLIC_DOMAIN}/${fileName}`;
                            } else {
                                imageUrl = `data:image/png;base64,${item.b64_json}`;
                            }
                        } catch (e) {
                            console.error("Failed to upload b64 to R2:", e);
                            imageUrl = `data:image/png;base64,${item.b64_json}`;
                        }
                    }

                    if (imageUrl) {
                        results.push(imageUrl);
                    }
                }
            }

            if (results.length > 0) {
                return new Response(
                    JSON.stringify({ images: results }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
                );
            } else {
                throw new Error("Seedream 4.5 returned no image data.");
            }
        }

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

                const reason = candidate.finishReason as any;
                if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT" || reason === "BLOCK_REASON_SAFETY" || reason === "IMAGE_OTHER" || reason === "IMAGE_SAFETY") {
                    return new Response(
                        JSON.stringify({
                            images: [],
                            error: "CONTENT_BLOCKED",
                            message: `IMAGE_CONTENT_BLOCKED: Reason: ${reason}`
                        }),
                        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        console.error("Worker Error:", error);

        // --- SAFETY VIOLATION HANDLING ---
        const isSafetyError =
            error.message?.includes("SAFETY") ||
            error.message?.includes("PROHIBITED_CONTENT") ||
            error.message?.includes("blocked") ||
            (error.response?.promptFeedback?.blockReason);

        if (isSafetyError && userId) {
            console.warn(`Safety violation detected for user ${userId}. Incrementing warning count.`);

            try {
                const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
            }
        }

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
}

// ============ GET GALLERY HANDLER ============
async function handleGetGallery(request: Request, env: Env): Promise<Response> {
    try {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        const body = await request.json() as GalleryRequest;
        const {
            page = 0,
            limit = 60,
            categoryId,
            userId,
            imageType,
            daysAgo,
            onlyFavorites,
            id
        } = body;

        let query = supabase
            .from('generations')
            .select('*, profiles(email)');

        // If ID is provided, fetch specific item
        if (id) {
            query = query.eq('id', id);
        } else {
            // Apply filters
            if (onlyFavorites) {
                query = query.eq('is_favorite', true);
            }
            if (categoryId) {
                query = query.eq('category_id', categoryId);
            }
            if (userId) {
                query = query.eq('user_id', userId);
            }
            if (imageType) {
                query = query.eq('image_type', imageType);
            }
            if (daysAgo) {
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);
                query = query.gte('created_at', date.toISOString());
            }

            // Apply Order and Pagination LAST
            query = query.order('created_at', { ascending: false })
                .range(page * limit, (page + 1) * limit - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching gallery:', error);
            throw error;
        }

        // Transform data to match frontend expectations
        const formattedData = (data || []).map((item: any) => ({
            id: item.id,
            thumbnail: item.image_url,
            images: [item.image_url],
            prompt: item.prompt,
            timestamp: new Date(item.created_at).getTime(),
            mode: item.mode,
            modelName: item.model_name,
            cost: item.cost_credits,
            imageType: item.image_type,
            isFavorite: item.is_favorite,
            categoryId: item.category_id,
            userEmail: item.profiles?.email
        }));

        return new Response(
            JSON.stringify({ images: formattedData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

    } catch (error: any) {
        console.error("Gallery Worker Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
}

// ============ PROXY IMAGE HANDLER ============
async function handleProxyImage(request: Request): Promise<Response> {
    try {
        const body = await request.json() as ProxyImageRequest;
        const { imageUrl } = body;

        if (!imageUrl) {
            return new Response(
                JSON.stringify({ error: 'imageUrl is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Fetch the image from the URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to base64
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        // Determine mime type
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const dataUrl = `data:${contentType};base64,${base64}`;

        return new Response(
            JSON.stringify({ image: dataUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('Proxy error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to proxy image', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}

// ============ MAIN ROUTER ============
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Route to appropriate handler
        if (path === '/generate-image' || path === '/api/generate-image') {
            return handleGenerateImage(request, env);
        }

        if (path === '/get-gallery' || path === '/api/get-gallery') {
            return handleGetGallery(request, env);
        }

        if (path === '/proxy-image' || path === '/api/proxy-image') {
            return handleProxyImage(request);
        }

        // Health check
        if (path === '/' || path === '/health') {
            return new Response(
                JSON.stringify({ status: 'ok', version: '1.0.0', endpoints: ['/generate-image', '/get-gallery', '/proxy-image'] }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Not Found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
};
