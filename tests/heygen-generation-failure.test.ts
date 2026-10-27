import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ writer: vi.fn(), cartesia: vi.fn(), synthesizeHeyGen: vi.fn() }));
vi.mock('../lib/voice/server', () => ({
  writer: mocks.writer, cartesia: mocks.cartesia, resolveVoice: vi.fn(),
  VoiceError: class extends Error { constructor(message: string, public status = 400) { super(message); } },
}));
vi.mock('../lib/voice/heygen', () => ({ synthesizeHeyGen: mocks.synthesizeHeyGen }));
import { completeVoiceGeneration } from '../lib/voice/api';

const input = { text: 'Nội dung gốc.', language: 'vi', speed: 1, voiceId: 'a1777309406040f8b90c19158dab5979' };
let rpc: ReturnType<typeof vi.fn>, update: ReturnType<typeof vi.fn>, upload: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  rpc = vi.fn().mockResolvedValue({ error: null });
  upload = vi.fn().mockResolvedValue({ error: null });
  const query = { update: vi.fn(), eq: vi.fn(), error: null };
  query.update.mockReturnValue(query); query.eq.mockReturnValue(query); update = query.update;
  mocks.writer.mockReturnValue({ rpc, from: () => query, storage: { from: () => ({ upload }) } });
});

test('confirmed HeyGen failure refunds once and never switches the document to Cartesia', async () => {
  mocks.synthesizeHeyGen.mockRejectedValue(new Error('HeyGen từ chối tạo.'));
  await expect(completeVoiceGeneration('user', input, { id: 'job', voice_id: input.voiceId })).rejects.toThrow('hoàn lại');
  expect(mocks.cartesia).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledExactlyOnceWith('windi_voice_finish', { p_job: 'job', p_success: false });
  expect(upload).not.toHaveBeenCalled();
});

test('ambiguous partial generation is held for reconciliation without automatic retry, refund or provider switch', async () => {
  mocks.synthesizeHeyGen.mockRejectedValue(new Error('Kết nối bị gián đoạn sau khi gửi.'));
  await expect(completeVoiceGeneration('user', input, { id: 'job', voice_id: input.voiceId })).rejects.toThrow('gián đoạn');
  expect(mocks.synthesizeHeyGen).toHaveBeenCalledTimes(1);
  expect(mocks.cartesia).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  expect(update).toHaveBeenCalledWith({ status: 'unknown', provider_context_id: 'job' });
});

test('one combined MP3 and one combined timing file are stored before the job finishes once', async () => {
  mocks.synthesizeHeyGen.mockResolvedValue({ mp3: Buffer.from('single-final-mp3'), timestamps: { words: ['Nội', 'dung'], start: [0, 1], end: [0.5, 1.5] } });
  const result = await completeVoiceGeneration('user', input, { id: 'job', voice_id: input.voiceId });
  expect(result.status).toBe('ready'); expect(upload).toHaveBeenCalledTimes(2);
  expect(upload.mock.calls[0][0]).toBe('user/job.mp3'); expect(upload.mock.calls[1][0]).toBe('user/job.json');
  expect(rpc).toHaveBeenCalledExactlyOnceWith('windi_voice_finish', { p_job: 'job', p_success: true, p_path: 'user/job.mp3' });
});
