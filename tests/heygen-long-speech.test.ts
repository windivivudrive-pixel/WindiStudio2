import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { planHeyGenChunks } from '../lib/voice/heygen-chunking';
import { decodeHeyGenWav, extractHeyGenChunk, HEYGEN_SAMPLE_RATE } from '../lib/voice/heygen-audio';
import { validateSpeech } from '../lib/voice/shared';

const encode = vi.hoisted(() => vi.fn(() => Buffer.from('MP3-final')));
vi.mock('server-only', () => ({}));
vi.mock('../lib/voice/api', () => ({ pcm16ToMp3: encode }));
vi.mock('../lib/voice/server', () => ({ VoiceError: class extends Error {
  constructor(message: string, public status = 400) { super(message); }
} }));

function wav(pcm: Buffer, junk = false) {
  const fmt = Buffer.alloc(24); fmt.write('fmt '); fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(1, 8); fmt.writeUInt16LE(1, 10); fmt.writeUInt32LE(44100, 12);
  fmt.writeUInt32LE(88200, 16); fmt.writeUInt16LE(2, 20); fmt.writeUInt16LE(16, 22);
  const data = Buffer.alloc(8); data.write('data'); data.writeUInt32LE(pcm.length, 4);
  const extra = junk ? Buffer.from([74, 85, 78, 75, 3, 0, 0, 0, 1, 2, 3, 0]) : Buffer.alloc(0);
  const header = Buffer.alloc(12); header.write('RIFF'); header.writeUInt32LE(4 + fmt.length + extra.length + data.length + pcm.length, 4); header.write('WAVE', 8);
  return Buffer.concat([header, fmt, extra, data, pcm]);
}

function fixture(text: string) {
  const chars = [...text];
  const original_characters = chars.map((char, index) => ({ text: char, start_time: index * 0.005, end_time: (index + 1) * 0.005 }));
  const pcm = Buffer.alloc(Math.ceil((chars.length * 0.005 + 0.1) * HEYGEN_SAMPLE_RATE) * 2);
  for (let index = 0; index < pcm.length; index += 2) pcm.writeInt16LE(1000, index);
  return { wav: wav(pcm, true), original_characters };
}

test('10k characters are conserved and packed into requests <=5000 including context', () => {
  const text = 'Hôm nay chúng ta cùng kể một câu chuyện thật đẹp. Bầu trời trong xanh và gió thổi nhẹ. '.repeat(130).slice(0, 10000).trim();
  const chunks = planHeyGenChunks(text);
  expect(chunks.length).toBeGreaterThanOrEqual(2);
  expect(chunks.length).toBeLessThanOrEqual(3);
  expect(chunks.map(chunk => chunk.text).join('')).toBe(text);
  expect(chunks.map(chunk => chunk.sourceStart)).toEqual([0, ...chunks.slice(0, -1).map(chunk => chunk.sourceEnd)]);
  for (const chunk of chunks) {
    expect(chunk.requestText.length).toBeLessThanOrEqual(5000);
    expect(chunk.context.length).toBeLessThanOrEqual(160);
    if (chunk.index < chunks.length - 1) expect(chunk.text.trim()).toMatch(/[.!?]$/u);
  }
});

test('long sentences, a giant word, decimals and emoji never lose text or split surrogate pairs', () => {
  for (const text of ['Một câu ' + 'rất dài, '.repeat(750) + 'kết thúc.', '😀'.repeat(3500), 'Tỷ lệ là 12.5 phần trăm. Giá trị 3.14 rất quen thuộc. '.repeat(120), 'a'.repeat(11000)]) {
    const chunks = planHeyGenChunks(text);
    expect(chunks.map(chunk => chunk.text).join('')).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.requestText.length).toBeLessThanOrEqual(5000);
      expect(chunk.text).not.toMatch(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/u);
    }
  }
});

test('a full sentence takes priority over context and paragraph changes reset context', () => {
  const text = 'Câu trước ngắn nhưng vẫn phải giữ nguyên toàn bộ. ' + 'A'.repeat(4980) + '.';
  const chunks = planHeyGenChunks(text);
  expect(chunks).toHaveLength(2);
  expect(chunks[1].context).toBe('');
  const paragraphs = planHeyGenChunks('A'.repeat(4996) + '.\n\n' + 'Câu chuyện mới. '.repeat(50));
  expect(paragraphs[0].text.endsWith('\n\n')).toBe(true);
  expect(paragraphs[1].context).toBe('');
});

test('RIFF parser handles padded JUNK chunks and refuses non-PCM16 mono audio', () => {
  const samples = Buffer.from([1, 0, 2, 0, 3, 0]);
  expect(decodeHeyGenWav(wav(samples, true))).toEqual(samples);
  const invalid = wav(samples); invalid.writeUInt16LE(2, 22);
  expect(() => decodeHeyGenWav(invalid)).toThrow('PCM16 mono');
});

test('context is removed using exact alignment and missing alignment never guesses the cut', () => {
  const chunk = { index: 1, sourceStart: 10, sourceEnd: 30, context: 'Câu trước.\n', text: 'Câu tiếp theo.', requestText: 'Câu trước.\nCâu tiếp theo.' };
  const data = fixture(chunk.requestText);
  const part = extractHeyGenChunk(chunk, data.wav, data);
  expect(part.timestamps.words).toEqual(['Câu', 'tiếp', 'theo.']);
  expect(part.duration).toBeLessThan(decodeHeyGenWav(data.wav).length / 2 / HEYGEN_SAMPLE_RATE);
  expect(part.timestamps.start[0]).toBeLessThanOrEqual(0.025);
  expect(() => extractHeyGenChunk(chunk, data.wav, {})).toThrow('thiếu timestamp chính xác');
});

test('the web accepts 5k source characters while rejecting larger input', () => {
  const input = { text: 'a'.repeat(5000), voiceId: '528ff6a33578494e827fbc7451b9f4b4', requestKey: '00000000-0000-4000-8000-000000000011' };
  expect(validateSpeech(input).text).toHaveLength(5000);
  expect(() => validateSpeech({ ...input, text: input.text + 'a' })).toThrow('INVALID_INPUT');
});

beforeEach(() => { vi.resetModules(); encode.mockClear(); vi.stubEnv('HEYGEN_API_KEY', 'test-key'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

test('multi-request synthesis encodes once, removes overlap words and offsets timestamps by actual samples', async () => {
  vi.useFakeTimers();
  const requests: Record<string, unknown>[] = [];
  const downloads = new Map<string, Buffer>();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === 'https://api.heygen.com/v3/models/audio/tts') {
      const body = JSON.parse(String(init?.body)); requests.push(body);
      const data = fixture(body.text); const audio_url = `https://audio.example/${requests.length}`;
      downloads.set(audio_url, data.wav);
      return Response.json({ data: { audio_url, original_characters: data.original_characters, duration: 99999 } });
    }
    return new Response(new Uint8Array(downloads.get(url)!));
  }));
  const { synthesizeHeyGen } = await import('../lib/voice/heygen');
  const text = 'Câu chuyện của chúng ta vẫn tiếp tục. '.repeat(180).trim();
  const promise = synthesizeHeyGen({ text, language: 'vi', speed: 1, voiceId: 'voice' }, 'voice');
  await vi.runAllTimersAsync();
  const result = await promise;
  expect(requests.length).toBeGreaterThan(1);
  expect(requests.every(request => String(request.text).length <= 5000 && request.expressiveness_boost === 0.8 && request.with_timestamps === true && request.language === 'vi' && request.model === 'heygen-voice-1-turbo-free')).toBe(true);
  expect(result.timestamps.words).toEqual(text.split(/\s+/u));
  expect(result.duration).toBeLessThan(100);
  expect(result.joins).toHaveLength(requests.length - 1);
  expect(result.joins[0].seconds).toBeGreaterThan(0);
  expect(result.timestamps.start.every((time, index, values) => index === 0 || time >= values[index - 1])).toBe(true);
  expect(encode).toHaveBeenCalledTimes(1);
  expect(result.mp3.toString()).toBe('MP3-final');
});

test('429 honors Retry-After while a successful output download retries without new synthesis', async () => {
  vi.useFakeTimers();
  const starts: number[] = []; let downloads = 0;
  const data = fixture('Xin chào.');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/tts')) {
      starts.push(Date.now());
      if (starts.length === 1) return new Response(null, { status: 429, headers: { 'Retry-After': '7' } });
      return Response.json({ data: { audio_url: 'https://audio.example/result', original_characters: data.original_characters } });
    }
    if (++downloads === 1) throw new Error('download offline');
    return new Response(new Uint8Array(data.wav));
  }));
  const { synthesizeHeyGen } = await import('../lib/voice/heygen');
  const promise = synthesizeHeyGen({ text: 'Xin chào.', language: 'vi', speed: 1, voiceId: 'voice' }, 'voice');
  await vi.runAllTimersAsync(); await promise;
  expect(starts).toHaveLength(2); expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(7000);
  expect(downloads).toBe(2); expect(encode).toHaveBeenCalledTimes(1);
});

test('an ambiguous network failure never sends a second TTS request', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error('network timeout')); vi.stubGlobal('fetch', fetchMock);
  const { synthesizeHeyGen } = await import('../lib/voice/heygen');
  await expect(synthesizeHeyGen({ text: 'Xin chào.', language: 'vi', speed: 1, voiceId: 'voice' }, 'voice')).rejects.toThrow('gián đoạn');
  expect(fetchMock).toHaveBeenCalledTimes(1); expect(encode).not.toHaveBeenCalled();
});
