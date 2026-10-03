export const VOICE_SERVICE_BRAND = 'Windi Clone Pro 2.1';

/** Sanitize provider-authored display text before exposing it to customers. */
export function voiceDisplayText(value: string) {
  return value
    .replace(/https?:\/\/[^\s]*(?:cartesia|sonic)[^\s]*/gi, VOICE_SERVICE_BRAND)
    .replace(/\bcartesia(?:[_-][a-z0-9_]+)?\b|\bsonic(?:[ _-]?\d+(?:\.\d+)*)?\b/gi, VOICE_SERVICE_BRAND)
    .replace(/(?<!Windi )\bClone Pro 2\.1\b/g, VOICE_SERVICE_BRAND);
}
