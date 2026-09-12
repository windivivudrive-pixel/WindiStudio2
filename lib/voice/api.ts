import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import lamejs from '@breezystack/lamejs';
import { cartesia, resolveVoice, VoiceError, writer } from './server';
import { DEFAULT_WORKFLOW_VOICE_ID, countCredits, isUUID, VOICE_LANGUAGES } from './shared';

export const voiceTimingBucket = 'windi-voice-timing';
const VOICE_TOKEN_PREFIX = 'windi_voice_';
const WORKFLOW_TOKEN_PREFIX = 'windi_kit_';
const MAX_TEXT_LENGTH = 10_000;

type AutomationIdentity = {
  userId: string;
  tokenId: string;
};

export type VoiceApiAccess = {
  hasPaidVoicePlan: boolean;
  hasWorkflowLicense: boolean;
  workflowEntitlementId: string | null;
};

export type VoiceApiInput = {
  text: string;
  voiceId: string;
  language: string;
  speed: number;
};

export type WordTimestamps = {
  words: string[];
  start: number[];
  end: number[];
};

// Cartesia quantizes some short Vietnamese words to the same start/end tick.
// Keep those words in the timeline with one 20 ms frame so caption and visual
// sync do not lose a spoken token just because of provider-side rounding.
const MIN_TIMESTAMP_DURATION_SECONDS = 0.02;

export function hashAutomationToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createAutomationToken() {
  const secret = `${VOICE_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  return {
    secret,
    hash: hashAutomationToken(secret),
    prefix: secret.slice(0, VOICE_TOKEN_PREFIX.length + 8),
    lastFour: secret.slice(-4),
  };
}

export function automationTokenDescriptor(authorization: string) {
  const match = authorization.match(/^Bearer\s+((?:windi_voice_|windi_kit_)[A-Za-z0-9_-]+)$/);
  if (!match) throw new VoiceError('Token Windi bị thiếu hoặc không hợp lệ.', 401);
  const token = match[1];
  const isWorkflowToken = token.startsWith(WORKFLOW_TOKEN_PREFIX);
  const tokenPrefix = isWorkflowToken ? WORKFLOW_TOKEN_PREFIX : VOICE_TOKEN_PREFIX;
  return {
    token,
    purpose: isWorkflowToken ? 'video_workflow' as const : 'voice_api' as const,
    prefix: token.slice(0, tokenPrefix.length + 8),
    isWorkflowToken,
  };
}

function safeHashEqual(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function voiceApiAccess(userId: string): Promise<VoiceApiAccess> {
  const db = writer();
  const now = new Date().toISOString();
  const [voicePlan, workflowLicense] = await Promise.all([
    db
      .from('windi_voice_periods')
      .select('id')
      .eq('user_id', userId)
      .neq('plan_id', 'welcome')
      .lte('starts_at', now)
      .gt('ends_at', now)
      .limit(1)
      .maybeSingle(),
    db
      .from('product_entitlements')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', 'video_workflow_v1')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ]);
  if (voicePlan.error) throw voicePlan.error;
  if (workflowLicense.error) throw workflowLicense.error;
  return {
    hasPaidVoicePlan: Boolean(voicePlan.data),
    hasWorkflowLicense: Boolean(workflowLicense.data),
    workflowEntitlementId: workflowLicense.data?.id ?? null,
  };
}

export async function automationIdentity(request: Request): Promise<AutomationIdentity> {
  const authorization = request.headers.get('authorization') ?? '';
  const descriptor = automationTokenDescriptor(authorization);
  const { token, isWorkflowToken } = descriptor;
  const tokenHash = hashAutomationToken(token);
  const db = writer();
  const { data, error } = await db
    .from('automation_tokens')
    .select('id,user_id,token_hash,revoked_at')
    .eq('token_prefix', descriptor.prefix)
    .eq('purpose', descriptor.purpose)
    .is('revoked_at', null)
    .limit(10);
  if (error) throw error;
  const found = data?.find((row) => safeHashEqual(row.token_hash, tokenHash));
  if (!found) throw new VoiceError('Token Windi không hợp lệ hoặc đã bị thu hồi.', 401);

  const access = await voiceApiAccess(found.user_id);
  if (isWorkflowToken && !access.hasWorkflowLicense) {
    throw new VoiceError('Giấy phép Windi Video Workflow không còn hoạt động.', 403);
  }
  if (!isWorkflowToken && !access.hasPaidVoicePlan && !access.hasWorkflowLicense) {
    throw new VoiceError('API cần gói Windi Voice trả phí hoặc giấy phép Windi Video Workflow.', 403);
  }

  await db.from('automation_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', found.id);
  return { userId: found.user_id, tokenId: found.id };
}

export function validateVoiceApiInput(value: unknown): VoiceApiInput {
  if (!value || typeof value !== 'object') throw new VoiceError('Nội dung yêu cầu không hợp lệ.');
  const body = value as Record<string, unknown>;
  const text = typeof body.text === 'string' ? body.text.normalize('NFC').trim() : '';
  const voiceId = typeof body.voice_id === 'string' ? body.voice_id : '';
  const language = typeof body.language === 'string' ? body.language : 'vi';
  const speed = body.speed === undefined ? 1 : Number(body.speed);
  if (
    !text || countCredits(text) > MAX_TEXT_LENGTH || !isUUID(voiceId) ||
    !VOICE_LANGUAGES.some((item) => item.id === language) ||
    !Number.isFinite(speed) || speed < 0.6 || speed > 1.5
  ) throw new VoiceError('Kiểm tra text, voice_id, language và speed. Tối đa 10.000 ký tự.');
  return { text, voiceId, language, speed };
}

export function requestHash(input: VoiceApiInput) {
  return createHash('sha256').update(JSON.stringify(input), 'utf8').digest('hex');
}

export function requestUuid(userId: string, tokenId: string, idempotencyKey: string) {
  const digest = createHash('sha256').update(`${userId}\0${tokenId}\0${idempotencyKey}`, 'utf8').digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function requireIdempotencyKey(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim() ?? '';
  if (!value || value.length > 200 || /[\u0000-\u001f]/.test(value)) {
    throw new VoiceError('Thiếu Idempotency-Key hợp lệ.', 400);
  }
  return value;
}

export function parseCartesiaSse(payload: string) {
  const audio: Buffer[] = [];
  const timestamps: WordTimestamps = { words: [], start: [], end: [] };
  for (const block of payload.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data || data === '[DONE]') continue;
    let event: Record<string, unknown>;
    try { event = JSON.parse(data) as Record<string, unknown>; }
    catch { throw new VoiceError('Phản hồi timestamp từ nhà cung cấp không hợp lệ.', 502); }
    if (event.type === 'chunk' && typeof event.data === 'string') {
      audio.push(Buffer.from(event.data, 'base64'));
    } else if (event.type === 'timestamps') {
      const value = event.word_timestamps as Partial<WordTimestamps> | undefined;
      if (!value || !Array.isArray(value.words) || !Array.isArray(value.start) || !Array.isArray(value.end) || value.words.length !== value.start.length || value.words.length !== value.end.length) {
        throw new VoiceError('Phản hồi timestamp từ nhà cung cấp không hợp lệ.', 502);
      }
      for (let index = 0; index < value.words.length; index += 1) {
        const word = value.words[index];
        const start = Number(value.start[index]);
        const end = Number(value.end[index]);
        if (typeof word !== 'string' || !word.trim() || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
          throw new VoiceError('Phản hồi timestamp từ nhà cung cấp không hợp lệ.', 502);
        }
        timestamps.words.push(word);
        timestamps.start.push(start);
        timestamps.end.push(end === start ? start + MIN_TIMESTAMP_DURATION_SECONDS : end);
      }
    } else if (event.type === 'error') {
      throw new VoiceError('Nhà cung cấp từ chối tạo giọng. Credit sẽ được hoàn lại.', 502);
    }
  }
  return { pcm: Buffer.concat(audio), timestamps };
}

export function cartesiaTtsPayload(input: VoiceApiInput, providerVoiceId: string, contextId: string) {
  return {
    model_id: 'sonic-3.6',
    transcript: input.text,
    voice: { mode: 'id', id: providerVoiceId },
    language: input.language,
    output_format: { container: 'raw', encoding: 'pcm_s16le', sample_rate: 44100 },
    generation_config: { speed: input.speed },
    add_timestamps: true,
    use_normalized_timestamps: true,
    context_id: contextId,
  };
}

export function pcm16ToMp3(pcm: Uint8Array, sampleRate = 44_100, kbps = 128) {
  if (!pcm.byteLength || pcm.byteLength % 2 !== 0) throw new VoiceError('Dữ liệu âm thanh trả về không hợp lệ.', 502);
  const samples = new Int16Array(pcm.byteLength / 2);
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  for (let index = 0; index < samples.length; index += 1) samples[index] = view.getInt16(index * 2, true);
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
  const frames: Uint8Array[] = [];
  const frameSize = 1152;
  for (let offset = 0; offset < samples.length; offset += frameSize) {
    const encoded = encoder.encodeBuffer(samples.subarray(offset, Math.min(offset + frameSize, samples.length)));
    if (encoded.length) frames.push(encoded);
  }
  const tail = encoder.flush();
  if (tail.length) frames.push(tail);
  const result = Buffer.concat(frames.map((frame) => Buffer.from(frame)));
  if (!result.byteLength) throw new VoiceError('Không mã hóa được file MP3.', 502);
  return result;
}

export async function createVoiceGeneration(identity: AutomationIdentity, input: VoiceApiInput, idempotencyKey: string) {
  const voice = await resolveVoice(identity.userId, input.voiceId);
  const db = writer();
  const key = requestUuid(identity.userId, identity.tokenId, idempotencyKey);
  const contentHash = requestHash(input);
  const { data: job, error } = await db.rpc('windi_voice_reserve', {
    p_user: identity.userId,
    p_key: key,
    p_voice: voice.id,
    p_name: voice.name,
    p_text: input.text,
    p_language: input.language,
    p_speed: input.speed,
  });
  if (error) throw error;
  if (job.api_request_hash && job.api_request_hash !== contentHash) throw new VoiceError('Idempotency-Key đã được dùng cho nội dung khác.', 409);
  if (job.status !== 'reserved') return job;

  const claim = await db
    .from('windi_voice_jobs')
    .update({ status: 'pending', api_request_hash: contentHash, automation_token_id: identity.tokenId })
    .eq('id', job.id)
    .eq('status', 'reserved')
    .select('*')
    .maybeSingle();
  if (claim.error) throw claim.error;
  if (!claim.data) throw new VoiceError('Yêu cầu đang được xử lý. Hãy kiểm tra trạng thái thay vì gửi lại.', 409);

  let response: Response;
  try {
    response = await cartesia('/tts/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(cartesiaTtsPayload(input, voice.id, job.id)),
    }, {userId:identity.userId,purpose:voice.id===DEFAULT_WORKFLOW_VOICE_ID?'main':'tts'});
  } catch {
    await db.from('windi_voice_jobs').update({ status: 'unknown', provider_context_id: job.id }).eq('id', job.id).eq('status', 'pending');
    throw new VoiceError('Kết nối bị gián đoạn sau khi gửi. Yêu cầu đang chờ đối soát và sẽ không tự tạo lại.', 503);
  }
  if (!response.ok) {
    const refund = await db.rpc('windi_voice_finish', { p_job: job.id, p_success: false });
    if (refund.error) throw refund.error;
    throw new VoiceError('Nhà cung cấp chưa tạo được âm thanh. Credit đã được hoàn lại.', 502);
  }

  let payload: string;
  try {
    payload = await response.text();
  } catch {
    await db.from('windi_voice_jobs').update({ status: 'unknown', provider_context_id: job.id }).eq('id', job.id).eq('status', 'pending');
    throw new VoiceError('Kết nối bị gián đoạn khi nhận âm thanh. Yêu cầu đang chờ đối soát và sẽ không tự tạo lại.', 503);
  }

  let parsed: ReturnType<typeof parseCartesiaSse>;
  let mp3: Buffer;
  try {
    parsed = parseCartesiaSse(payload);
    if (!parsed.pcm.byteLength) throw new VoiceError('Nhà cung cấp không trả dữ liệu âm thanh hợp lệ.', 502);
    if (!parsed.timestamps.words.length) throw new VoiceError('Nhà cung cấp không trả word timestamp cho lần tạo giọng này.', 502);
    mp3 = pcm16ToMp3(parsed.pcm);
  } catch (parseError) {
    const refund = await db.rpc('windi_voice_finish', { p_job: job.id, p_success: false });
    if (refund.error) throw refund.error;
    const detail = parseError instanceof VoiceError ? parseError.message : 'Phản hồi từ nhà cung cấp không hợp lệ.';
    throw new VoiceError(`${detail} Credit đã được hoàn lại.`, 502);
  }
  const audioPath = `${identity.userId}/${job.id}.mp3`;
  const timingPath = `${identity.userId}/${job.id}.json`;
  const audioUpload = await db.storage.from('windi-voice-audio').upload(audioPath, mp3, { contentType: 'audio/mpeg', upsert: false });
  if (audioUpload.error) {
    const refund = await db.rpc('windi_voice_finish', { p_job: job.id, p_success: false });
    if (refund.error) throw refund.error;
    throw new VoiceError('Chưa lưu được âm thanh. Credit đã được hoàn lại.', 503);
  }
  const timingUpload = await db.storage.from(voiceTimingBucket).upload(timingPath, JSON.stringify(parsed.timestamps), { contentType: 'application/json', upsert: false });
  if (timingUpload.error) {
    await db.storage.from('windi-voice-audio').remove([audioPath]);
    const refund = await db.rpc('windi_voice_finish', { p_job: job.id, p_success: false });
    if (refund.error) throw refund.error;
    throw new VoiceError('Chưa lưu được timestamp. Credit đã được hoàn lại.', 503);
  }
  const metadata = await db.from('windi_voice_jobs').update({ timing_path: timingPath, provider_context_id: job.id }).eq('id', job.id).eq('status', 'pending');
  if (metadata.error) {
    await Promise.all([
      db.storage.from('windi-voice-audio').remove([audioPath]),
      db.storage.from(voiceTimingBucket).remove([timingPath]),
    ]);
    const refund = await db.rpc('windi_voice_finish', { p_job: job.id, p_success: false });
    if (refund.error) throw refund.error;
    throw new VoiceError('Chưa hoàn tất lưu kết quả. Credit đã được hoàn lại.', 503);
  }
  const finish = await db.rpc('windi_voice_finish', { p_job: job.id, p_success: true, p_path: audioPath });
  if (finish.error) {
    await db.from('windi_voice_jobs').update({ status: 'unknown', provider_context_id: job.id }).eq('id', job.id).eq('status', 'pending');
    throw new VoiceError('Kết quả đã lưu nhưng chưa xác nhận được credit. Yêu cầu đang chờ đối soát.', 503);
  }
  return { ...claim.data, status: 'ready', storage_path: audioPath, timing_path: timingPath };
}
