import { randomUUID } from 'node:crypto';
import { writer, VoiceError } from '@/lib/voice/server';
import { requireGeminiAdmin, geminiFailure, privateHeaders } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    await requireGeminiAdmin(request);
    const max = 5 * 1024 * 1024;
    // Bound the streamed body before parsing multipart data.
    const reader = request.body?.getReader();
    if (!reader) throw new VoiceError('Chọn một ảnh.');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max + 65536) { await reader.cancel(); throw new VoiceError('Ảnh tối đa 5 MB.'); } chunks.push(value); }
    const form = await new Response(new Blob(chunks as BlobPart[]), { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > max || !file.size) throw new VoiceError('Chọn ảnh PNG, JPEG hoặc WebP tối đa 5 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' ? 'webp' : null;
    if (!ext) throw new VoiceError('Ảnh phải là PNG, JPEG hoặc WebP.');
    const storage = writer().storage;
    const bucket = 'shop-thumbnails';
    const existing = await storage.getBucket(bucket);
    if (existing.error) {
      const created = await storage.createBucket(bucket,{public:true,fileSizeLimit:max,allowedMimeTypes:['image/png','image/jpeg','image/webp']});
      if (created.error && !created.error.message.toLowerCase().includes('already exists')) throw created.error;
    }
    const path = `${randomUUID()}.${ext}`;
    const result = await storage.from(bucket).upload(path,bytes,{contentType:ext==='jpg'?'image/jpeg':`image/${ext}`,upsert:false});
    if (result.error) throw result.error;
    return Response.json({ url: storage.from(bucket).getPublicUrl(path).data.publicUrl },{headers:privateHeaders});
  } catch (error) { return geminiFailure(error); }
}
