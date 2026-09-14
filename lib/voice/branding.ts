/** Sanitize provider-authored display text before exposing it to customers. */
export function voiceDisplayText(value: string) {
  return value.replace(/https?:\/\/[^\s]*cartesia[^\s]*/gi, 'Clone Pro 2.1').replace(/cartesia/gi, 'Clone Pro 2.1');
}
