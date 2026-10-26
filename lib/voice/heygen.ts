import 'server-only';

import { pcm16ToMp3, type WordTimestamps } from './api';
import { VoiceError } from './server';
import type { VoiceApiInput } from './api';

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
};

export async function synthesizeHeyGen(
  input: VoiceApiInput,
  providerVoiceId: string,
  model?: string
): Promise<HeyGenTtsResult> {
  const key = heygenApiKey();
  const selectedModel = model || process.env.HEYGEN_TTS_MODEL || 'heygen-voice-1-turbo-free';

  const response = await fetch('https://api.heygen.com/v3/models/audio/tts', {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      voice_id: providerVoiceId,
      text: input.text,
      model: selectedModel,
      with_timestamps: true,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    let errMessage = 'HeyGen TTS không thể tạo âm thanh.';
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errMessage = `HeyGen: ${errJson.error.message}`;
      }
    } catch {
      // ignore
    }
    throw new VoiceError(errMessage, response.status === 402 ? 402 : 502);
  }

  const result = await response.json();
  const audioUrl = result?.data?.audio_url;
  if (!audioUrl) {
    throw new VoiceError('HeyGen không trả về đường dẫn âm thanh hợp lệ.', 502);
  }

  const audioRes = await fetch(audioUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(60000),
  });
  if (!audioRes.ok) {
    throw new VoiceError('Không thể tải file âm thanh từ HeyGen.', 502);
  }
  const wavBytes = Buffer.from(await audioRes.arrayBuffer());
  if (wavBytes.byteLength <= 44) {
    throw new VoiceError('File âm thanh từ HeyGen rỗng.', 502);
  }

  // HeyGen returns standard 44.1kHz mono PCM16 WAV.
  // Bytes 0-43 are WAV RIFF header, bytes 44+ are raw PCM16 samples.
  const pcm = wavBytes.subarray(44);
  const mp3 = pcm16ToMp3(pcm);

  // Extract word timestamps
  const rawWords = Array.isArray(result?.data?.original_words) ? result.data.original_words : [];
  const words: string[] = [];
  const start: number[] = [];
  const end: number[] = [];

  for (const item of rawWords) {
    if (typeof item?.text === 'string' && Number.isFinite(item?.start_time) && Number.isFinite(item?.end_time)) {
      words.push(item.text);
      start.push(Number(item.start_time));
      end.push(Math.max(Number(item.end_time), Number(item.start_time) + 0.02));
    }
  }

  // Fallback: If no words returned, synthesize approximate timestamps from text
  if (!words.length) {
    const textWords = input.text.split(/\s+/).filter(Boolean);
    const totalDuration = Number(result?.data?.duration) || 1;
    const wordDur = totalDuration / Math.max(textWords.length, 1);
    for (let i = 0; i < textWords.length; i++) {
      words.push(textWords[i]);
      start.push(i * wordDur);
      end.push((i + 1) * wordDur);
    }
  }

  return {
    mp3,
    timestamps: { words, start, end },
    duration: Number(result?.data?.duration) || 0,
  };
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
