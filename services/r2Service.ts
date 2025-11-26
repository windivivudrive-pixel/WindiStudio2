import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;
const ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || 'windi-bucket';
const PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_DOMAIN;

const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

export const uploadToR2 = async (blob: Blob, fileName: string, contentType: string = 'image/jpeg'): Promise<string | null> => {
    if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !PUBLIC_DOMAIN) {
        console.error("R2 Credentials missing in .env.local");
        return null;
    }

    try {
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: contentType,
        });

        await R2.send(command);

        // Construct Public URL
        // Ensure PUBLIC_DOMAIN doesn't end with slash and fileName doesn't start with slash to avoid double slashes
        const domain = PUBLIC_DOMAIN.replace(/\/$/, '');
        const path = fileName.replace(/^\//, '');

        return `${domain}/${path}`;
    } catch (error) {
        console.error("Error uploading to R2:", error);
        return null;
    }
};

export const deleteFromR2 = async (fileName: string): Promise<boolean> => {
    if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
        console.error("R2 Credentials missing");
        return false;
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
        });

        await R2.send(command);
        return true;
    } catch (error) {
        console.error("Error deleting from R2:", error);
        return false;
    }
};
