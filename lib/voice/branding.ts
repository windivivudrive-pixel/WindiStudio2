export const VOICE_SERVICE_BRAND = 'Windi Clone Pro 3.0';

/** Sanitize provider-authored display text before exposing it to customers. */
export function voiceDisplayText(value: string) {
  return value
    .replace(/https?:\/\/[^\s]*(?:cartesia|sonic|heygen)[^\s]*/gi, VOICE_SERVICE_BRAND)
    .replace(/\b(?:cartesia|heygen)(?:[_-][a-z0-9_]+)?\b|\bsonic(?:[ _-]?\d+(?:\.\d+)*)?\b/gi, VOICE_SERVICE_BRAND)
    .replace(/(?<!Windi )\bClone Pro (?:2\.1|3\.0)\b/g, VOICE_SERVICE_BRAND);
}
