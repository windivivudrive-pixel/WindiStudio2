import type { WordTimestamps } from './api';
import type { HeyGenChunk } from './heygen-chunking';

type Alignment = { text: string; start_time: number; end_time: number };
export const HEYGEN_SAMPLE_RATE = 44100;

export function decodeHeyGenWav(wav: Buffer): Buffer {
  if (wav.length < 12 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE')
    throw new Error('HeyGen trả về WAV không hợp lệ.');
  let validFormat = false;
  const buffers: Buffer[] = [];
  for (let offset = 12; offset + 8 <= wav.length;) {
    const kind = wav.toString('ascii', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (body + size > wav.length) throw new Error('File WAV HeyGen bị thiếu dữ liệu.');
    if (kind === 'fmt ') {
      if (size < 16) throw new Error('Định dạng WAV HeyGen không hợp lệ.');
      validFormat = wav.readUInt16LE(body) === 1 && wav.readUInt16LE(body + 2) === 1
        && wav.readUInt32LE(body + 4) === HEYGEN_SAMPLE_RATE && wav.readUInt16LE(body + 14) === 16;
    }
    if (kind === 'data') buffers.push(wav.subarray(body, body + size));
    offset = body + size + (size % 2);
  }
  const pcm = Buffer.concat(buffers);
  if (!validFormat || !pcm.length || pcm.length % 2) throw new Error('HeyGen phải trả về WAV PCM16 mono 44.1 kHz.');
  return pcm;
}

function validAlignment(value: unknown): Alignment[] {
  if (!Array.isArray(value)) return [];
  let previous = 0;
  const result: Alignment[] = [];
  for (const entry of value) {
    if (entry?.text === '<start>' || entry?.text === '<end>') continue;
    if (typeof entry?.text !== 'string' || !Number.isFinite(entry.start_time)
      || !Number.isFinite(entry.end_time) || entry.start_time < previous || entry.end_time < entry.start_time) return [];
    previous = entry.start_time;
    result.push(entry);
  }
  return result;
}

export function extractHeyGenChunk(chunk: HeyGenChunk, wav: Buffer, data: { original_characters?: unknown; original_words?: unknown }) {
  const pcm = decodeHeyGenWav(wav);
  const duration = pcm.length / 2 / HEYGEN_SAMPLE_RATE;
  const chars = validAlignment(data.original_characters);
  const wordAlignment = validAlignment(data.original_words);
  const words = [...chunk.text.matchAll(/\S+/gu)];
  let timings: { text: string; start: number; end: number }[] = [];
  let contextEnd = 0;
  if (chars.length && chars.map(char => char.text).join('') === chunk.requestText) {
    let offset = 0;
    const spans = chars.map(char => {
      const span = { ...char, from: offset, to: offset + char.text.length };
      offset = span.to;
      return span;
    });
    contextEnd = spans.filter(char => char.to <= chunk.context.length && char.text.trim()).at(-1)?.end_time || 0;
    timings = words.map(word => {
      const from = chunk.context.length + word.index!;
      const to = from + word[0].length;
      const aligned = spans.filter(char => char.to > from && char.from < to);
      return { text: word[0], start: aligned[0].start_time, end: aligned.at(-1)!.end_time };
    });
  } else if (wordAlignment.length && wordAlignment.map(word => word.text.trim()).join(' ') === chunk.requestText.trim().split(/\s+/u).join(' ')) {
    const prefixWords = chunk.context.trim() ? chunk.context.trim().split(/\s+/u).length : 0;
    contextEnd = prefixWords ? wordAlignment[prefixWords - 1].end_time : 0;
    timings = wordAlignment.slice(prefixWords).map(word => ({ text: word.text, start: word.start_time, end: word.end_time }));
  } else if (chunk.context) {
    // Never guess a context trim: approximate alignment could repeat or remove speech.
    throw new Error('HeyGen thiếu timestamp chính xác để bỏ đoạn ngữ cảnh.');
  } else {
    timings = words.map((word, index) => ({ text: word[0], start: index * duration / words.length, end: (index + 1) * duration / words.length }));
  }
  if (!timings.length || timings.some(word => word.start < 0 || word.end > duration + 0.1))
    throw new Error('Timestamp HeyGen không khớp độ dài âm thanh.');
  const cutTime = chunk.context ? Math.max(contextEnd, timings[0].start - 0.025, 0) : 0;
  const cutSample = Math.ceil(cutTime * HEYGEN_SAMPLE_RATE);
  const trimmed = Buffer.from(pcm.subarray(cutSample * 2));
  if (!trimmed.length) throw new Error('Đoạn âm thanh HeyGen rỗng sau khi bỏ ngữ cảnh.');
  const actualCut = cutSample / HEYGEN_SAMPLE_RATE;
  const trimmedDuration = trimmed.length / 2 / HEYGEN_SAMPLE_RATE;
  // A 3 ms ramp prevents sample discontinuities without overlapping spoken words.
  const ramp = Math.min(Math.floor(HEYGEN_SAMPLE_RATE * 0.003), Math.floor(trimmed.length / 4));
  for (let index = 0; index < ramp; index++) {
    const gain = index / ramp;
    trimmed.writeInt16LE(Math.round(trimmed.readInt16LE(index * 2) * gain), index * 2);
    const tail = trimmed.length - 2 - index * 2;
    trimmed.writeInt16LE(Math.round(trimmed.readInt16LE(tail) * gain), tail);
  }
  const timestamps: WordTimestamps = { words: [], start: [], end: [] };
  for (const word of timings) {
    const start = Math.min(trimmedDuration, Math.max(0, word.start - actualCut));
    timestamps.words.push(word.text);
    timestamps.start.push(start);
    timestamps.end.push(Math.min(trimmedDuration, Math.max(start, word.end - actualCut)));
  }
  return { pcm: trimmed, timestamps, duration: trimmedDuration };
}
