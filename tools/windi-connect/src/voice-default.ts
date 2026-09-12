export const DEFAULT_FLOW_VOICE_ID = '60cf30cf-dcad-4cb1-b2e9-b6c08a23569e';

export function resolveFlowVoice(explicit?:string, channel?:string, saved?:string) {
  const candidates = [['explicit', explicit], ['channel', channel], ['saved', saved], ['default', DEFAULT_FLOW_VOICE_ID]] as const;
  const [source, value] = candidates.find(([, value]) => value?.trim())!;
  const voiceId = value!.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voiceId)) {
    throw new Error(`INVALID_VOICE_ID (${source}): kiểm tra Voice ID đã cấu hình.`);
  }
  return {voiceId, source};
}
