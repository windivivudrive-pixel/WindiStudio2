import { expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));

test.skipIf(process.env.RUN_CURATED_PREVIEWS !== '1')('prepare and verify curated voice previews in storage', async () => {
  const { CURATED_PREVIEW_SCRIPTS, CURATED_PREVIEW_VERSION } = await import('../lib/voice/preview-scripts');
  const { CURATED_PUBLIC_VOICES } = await import('../lib/voice/shared');
  const { synthesizeHeyGen } = await import('../lib/voice/heygen');
  const { writer, previewBucket, previewPublicVoice } = await import('../lib/voice/server');
  const storage = writer().storage.from(previewBucket);
  for (const voice of CURATED_PUBLIC_VOICES) {
    const text = CURATED_PREVIEW_SCRIPTS[voice.id];
    expect(text, `missing script for ${voice.name}`).toBeTruthy();
    const path = `${CURATED_PREVIEW_VERSION}/${voice.id}.mp3`;
    const existing = await storage.download(path);
    if (!existing.error && existing.data?.size) {
      const served = await previewPublicVoice(new Request('http://localhost/api/voice/preview'), voice.id, true);
      expect(Buffer.from(served.audio).equals(Buffer.from(await existing.data.arrayBuffer()))).toBe(true);
      console.log(`${voice.name}: storage and playback path verified (${existing.data.size} bytes)`);
      continue;
    }
    if (existing.error && !existing.error.message.toLowerCase().includes('not found')) throw existing.error;
    const result = await synthesizeHeyGen({text, voiceId:voice.id, language:'vi', speed:1}, voice.id, 'heygen-voice-1-turbo-free');
    expect(result.mp3.length).toBeGreaterThan(1000);
    const saved = await storage.upload(path, result.mp3, {contentType:'audio/mpeg',cacheControl:'31536000',upsert:false});
    if (saved.error) throw saved.error;
    const check = await storage.download(path);
    if (check.error || !check.data) throw check.error || new Error('Stored preview missing');
    expect(Buffer.from(await check.data.arrayBuffer()).equals(result.mp3)).toBe(true);
    console.log(`${voice.name}: saved and verified (${result.mp3.length} bytes, ${result.duration.toFixed(1)}s, ${[...text].length} characters)`);
  }
}, 900000);
