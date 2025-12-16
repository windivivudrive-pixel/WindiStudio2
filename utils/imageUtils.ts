

export const base64ToBlob = async (base64Data: string): Promise<Blob> => {
  const base64Response = await fetch(base64Data);
  const blob = await base64Response.blob();
  return blob;
};

export const compressImage = async (base64Data: string, quality = 1.0): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Data;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      // Draw white background for transparency handling (PNG to JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => reject(err);
  });
};

/**
 * Compress image to a maximum file size (default 3MB for Cloudflare Workers compatibility)
 * Iteratively reduces quality until the image is under the target size
 */
export const compressImageToMaxSize = async (
  base64Data: string,
  maxSizeBytes: number = 3 * 1024 * 1024, // 3MB default
  maxDimension: number = 2048 // Max width/height
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Data;
    img.onload = async () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw white background and image
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width, height);

      // Binary search for optimal quality (aim for 2.5-3MB range)
      let minQuality = 0.3;
      let maxQuality = 0.98;
      let bestBlob: Blob | null = null;
      let attempts = 0;
      const maxAttempts = 8;

      while (attempts < maxAttempts && (maxQuality - minQuality) > 0.02) {
        const quality = (minQuality + maxQuality) / 2;
        const blob = await new Promise<Blob | null>((res) => {
          canvas.toBlob((b) => res(b), 'image/jpeg', quality);
        });

        if (blob) {
          if (blob.size <= maxSizeBytes) {
            bestBlob = blob;
            minQuality = quality; // Try higher quality
          } else {
            maxQuality = quality; // Need lower quality
          }
        }
        attempts++;
      }

      // If we found a good blob, use it
      if (bestBlob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(bestBlob);
        return;
      }

      // If still too large, reduce dimensions further
      const smallerCanvas = document.createElement('canvas');
      const smallerRatio = 0.7;
      smallerCanvas.width = Math.floor(width * smallerRatio);
      smallerCanvas.height = Math.floor(height * smallerRatio);
      const smallerCtx = smallerCanvas.getContext('2d');

      if (smallerCtx) {
        smallerCtx.fillStyle = '#FFFFFF';
        smallerCtx.fillRect(0, 0, smallerCanvas.width, smallerCanvas.height);
        smallerCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);

        smallerCanvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error('Failed to read blob'));
              reader.readAsDataURL(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.7
        );
      } else {
        reject(new Error('Failed to create smaller canvas'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
  });
};

/**
 * Check if base64 image exceeds size limit
 */
export const getBase64Size = (base64: string): number => {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  // Base64 encodes 3 bytes into 4 characters
  return Math.floor((base64Data.length * 3) / 4);
};

