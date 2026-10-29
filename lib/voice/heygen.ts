import 'server-only';

import { pcm16ToMp3, type WordTimestamps } from './api';
import { VoiceError } from './server';
import type { VoiceApiInput } from './api';
import { normalizeSpeechNumbers } from './shared';
import { HEYGEN_EXPRESSIVENESS, HEYGEN_REQUEST_RULE, planHeyGenChunks } from './heygen-chunking';
import { extractHeyGenChunk } from './heygen-audio';

export function heygenApiKey(): string {
  const key = process.env.HEYGEN_API_KEY || process.env.VITE_HEYGEN_API_KEY;
  if (!key) throw new VoiceError('Chưa cấu hình HEYGEN_API_KEY.', 503);
  return key;
}

export function heygenReady(): boolean {
  return Boolean(process.env.HEYGEN_API_KEY || process.env.VITE_HEYGEN_API_KEY);
}

export type HeyGenTtsResult = {
  mp3: Buffer;
  timestamps: WordTimestamps;
  duration: number;
  requestCount: number;
  rule: string;
  joins: { seconds: number; sourceOffset: number }[];
};

const sleep = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));
let nextRequestStart = 0;

async function requestSlot(deadline: number) {
  const start = Math.max(Date.now(), nextRequestStart);
  if (start > deadline - 15000) throw new VoiceError('HeyGen đang bận. Chưa đủ thời gian hoàn tất tài liệu này.', 503);
  nextRequestStart = start + 2200;
  if (start > Date.now()) await sleep(start - Date.now());
}

function remainingTimeout(deadline: number, maximum: number) {
  const remaining = deadline - Date.now();
  if (remaining < 1000) throw new VoiceError('HeyGen chưa hoàn tất tài liệu trong thời gian cho phép.', 503);
  return Math.min(maximum, remaining);
}

export async function synthesizeHeyGen(
  input: VoiceApiInput,
  providerVoiceId: string,
  model?: string
): Promise<HeyGenTtsResult> {
  const key = heygenApiKey();
  const selectedModel = model || process.env.HEYGEN_TTS_MODEL || 'heygen-voice-1-turbo-free';
  const normalizedText = normalizeSpeechNumbers(input.text, input.language);
  const chunks = planHeyGenChunks(normalizedText, input.language);
  if (!chunks.length) throw new VoiceError('Nội dung cần đọc đang trống.');
  const deadline = Date.now() + 250000;
  const audio: Buffer[] = [];
  const timestamps: WordTimestamps = { words: [], start: [], end: [] };
  const joins: HeyGenTtsResult['joins'] = [];
  let duration = 0;
  let requestCount = 0;
  for (const chunk of chunks) {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      await requestSlot(deadline);
      try {
        requestCount++;
        response = await fetch('https://api.heygen.com/v3/models/audio/tts', {
          method: 'POST',
          headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice_id: providerVoiceId, text: chunk.requestText,
            language: input.language, model: selectedModel,
            expressiveness_boost: providerVoiceId.toLowerCase() === "ff68799fc9c6495d9ce1524e530b2ebf" ? 1 : HEYGEN_EXPRESSIVENESS, with_timestamps: true }),
          cache: 'no-store', signal: AbortSignal.timeout(remainingTimeout(deadline, 90000)),
        });
      } catch {
        throw new VoiceError('Kết nối HeyGen bị gián đoạn sau khi gửi. Yêu cầu chờ đối soát và không tự tạo lại.', 503);
      }
      if (response.ok || ![429, 503].includes(response.status) || attempt === 2) break;
      const retryHeader = response.headers.get('Retry-After');
      const numericRetry = retryHeader === null ? NaN : Number(retryHeader);
      const retryMs = Number.isFinite(numericRetry) ? Math.max(0, numericRetry * 1000)
        : retryHeader && Number.isFinite(Date.parse(retryHeader)) ? Math.max(0, Date.parse(retryHeader) - Date.now()) : 2000 * 2 ** attempt;
      if (Date.now() + retryMs > deadline - 15000) throw new VoiceError('HeyGen đang giới hạn lượt tạo. Vui lòng thử lại sau.', 429);
      await sleep(retryMs);
    }
    if (!response?.ok) {
      // 5xx other than a documented capacity rejection can mean synthesis happened.
      if (response && response.status >= 500 && response.status !== 503)
        throw new VoiceError('HeyGen bị gián đoạn khi tạo. Yêu cầu chờ đối soát và không tự tạo lại.', 503);
      let message = 'HeyGen chưa thể tạo âm thanh.';
      try { const error = await response?.json(); if (error?.error?.message) message = String(error.error.message); } catch { /* explicit rejection */ }
      throw new VoiceError(message, response?.status === 429 ? 429 : response?.status === 402 ? 402 : 502);
    }
    let data: Record<string, unknown>;
    try { data = (await response.json()).data; }
    catch { throw new VoiceError('Kết nối HeyGen bị gián đoạn khi nhận kết quả. Yêu cầu chờ đối soát.', 503); }
    if (!data || typeof data.audio_url !== 'string') throw new VoiceError('HeyGen không trả về đường dẫn âm thanh hợp lệ.', 502);
    const audioUrl = new URL(data.audio_url);
    if (audioUrl.protocol !== 'https:') throw new VoiceError('Đường dẫn âm thanh HeyGen không hợp lệ.', 502);
    let wav: Buffer | undefined;
    // Download retries reuse the same output URL; they never create another TTS request.
    for (let attempt = 0; attempt < 2 && !wav; attempt++) {
      try {
        const download = await fetch(audioUrl.href, { cache: 'no-store', signal: AbortSignal.timeout(remainingTimeout(deadline, 30000)) });
        if (download.ok) wav = Buffer.from(await download.arrayBuffer());
      } catch { /* retry only the completed audio download */ }
    }
    if (!wav) throw new VoiceError('Tải âm thanh HeyGen bị gián đoạn. Yêu cầu chờ đối soát và không tự tạo lại.', 503);
    let part: ReturnType<typeof extractHeyGenChunk>;
    try { part = extractHeyGenChunk(chunk, wav, data); }
    catch (error) { throw new VoiceError((error as Error).message, 502); }
    if (chunk.index > 0) joins.push({ seconds: duration, sourceOffset: chunk.sourceStart });
    audio.push(part.pcm);
    timestamps.words.push(...part.timestamps.words);
    timestamps.start.push(...part.timestamps.start.map(time => time + duration));
    timestamps.end.push(...part.timestamps.end.map(time => time + duration));
    duration += part.duration;
  }
  return { mp3: pcm16ToMp3(Buffer.concat(audio)), timestamps, duration, requestCount, rule: HEYGEN_REQUEST_RULE, joins };
}

export async function uploadHeyGenAsset(clip: File | Blob | Buffer, filename = 'sample.mp3'): Promise<string> {
  const key = heygenApiKey();
  const formData = new FormData();
  if (clip instanceof File || clip instanceof Blob) {
    formData.append('file', clip, filename);
  } else {
    formData.append('file', new Blob([clip]), filename);
  }

  const response = await fetch('https://api.heygen.com/v3/assets', {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
    },
    body: formData,
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    let msg = 'Không thể tải file mẫu lên HeyGen.';
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) msg = `HeyGen: ${errJson.error.message}`;
    } catch {
      // ignore
    }
    throw new VoiceError(msg, response.status === 413 ? 413 : 502);
  }

  const result = await response.json();
  const assetId = result?.data?.asset_id;
  if (!assetId) {
    throw new VoiceError('HeyGen không trả về asset_id hợp lệ.', 502);
  }
  return assetId;
}

export async function cloneHeyGenVoice(clip: File | Blob | Buffer, name: string, filename = 'sample.mp3'): Promise<string> {
  const key = heygenApiKey();
  const assetId = await uploadHeyGenAsset(clip, filename);

  const cloneRes = await fetch('https://api.heygen.com/v3/models/audio/voices', {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'instant',
      name: name,
      audio: [
        {
          type: 'asset_id',
          asset_id: assetId,
        },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!cloneRes.ok) {
    let msg = 'HeyGen từ chối tạo giọng clone.';
    try {
      const errJson = await cloneRes.json();
      if (errJson?.error?.message) msg = `HeyGen: ${errJson.error.message}`;
    } catch {
      // ignore
    }
    throw new VoiceError(msg, cloneRes.status === 402 ? 402 : 502);
  }

  const cloneData = await cloneRes.json();
  const voiceId = cloneData?.data?.voice_id;
  if (!voiceId) {
    throw new VoiceError('HeyGen không trả về voice_id.', 502);
  }

  // Poll until active (instant clone usually takes 1-3 seconds)
  for (let i = 0; i < 15; i++) {
    try {
      const statusRes = await fetch(`https://api.heygen.com/v3/models/audio/voices/${encodeURIComponent(voiceId)}`, {
        headers: { 'X-Api-Key': key },
        signal: AbortSignal.timeout(10000),
      });
      if (statusRes.ok) {
        const data = await statusRes.json();
        const status = data?.data?.status;
        if (status === 'ACTIVE') {
          break;
        }
        if (status === 'FAILED') {
          throw new VoiceError('HeyGen xử lý giọng clone thất bại. Hãy thử lại với mẫu thu rõ tiếng hơn.', 502);
        }
      }
    } catch (e) {
      if (e instanceof VoiceError) throw e;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  return voiceId;
}

export async function deleteHeyGenVoice(voiceId: string): Promise<boolean> {
  try {
    const key = heygenApiKey();
    const response = await fetch(`https://api.heygen.com/v3/models/audio/voices/${encodeURIComponent(voiceId)}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': key },
      signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
