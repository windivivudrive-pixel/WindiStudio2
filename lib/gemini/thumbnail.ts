const optimized = new Set([
  'capcut-1-nam', 'capcut', 'chatgpt-1-thang-acc-cap-san', 'chatgpt-1-thang',
  'claude-1-thang', 'cursor-1-thang', 'cursor', 'elevenlabs-1-thang', 'elevenlabs',
  'gamma-6-thang', 'gamma', 'gemini-3-thang', 'gemini-chinh-chu', 'youtube-1-thang',
]);

export function optimizedThumbnail(url: string): string {
  const match = /^\/gemini-products\/([a-z0-9-]+)\.png$/.exec(url);
  return match && optimized.has(match[1]) ? `/gemini-products/${match[1]}.webp` : url;
}
