import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { CURATED_PUBLIC_VOICES, DEFAULT_STUDIO_VOICE, isUUID, validateSpeech } from '../lib/voice/shared';
import { publicVoice } from '../lib/voice/server';
import { cloneHeyGenVoice, deleteHeyGenVoice, uploadHeyGenAsset, heygenReady } from '../lib/voice/heygen';

describe('HeyGen Voice Integration & Cartesia Backup', () => {
  it('includes all 5 cloned voices with HeyGen and Cartesia IDs', () => {
    expect(CURATED_PUBLIC_VOICES).toHaveLength(5);

    const voiceNames = CURATED_PUBLIC_VOICES.map((v) => v.name);
    expect(voiceNames).toEqual(['Đức Bảo', 'Minh Dự', 'Ngô Đình', 'Kim Ánh', 'Tố My']);

    for (const voice of CURATED_PUBLIC_VOICES) {
      expect(voice.provider).toBe('heygen');
      expect(voice.heygenId).toBeDefined();
      expect(voice.heygenId).toMatch(/^[0-9a-f]{32}$/i);
      expect(voice.cartesiaId).toBeDefined();
      expect(voice.cartesiaId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(voice.language).toBe('vi');
    }
  });

  it('validates 32-character HeyGen IDs and standard 36-character UUIDs', () => {
    // 32-character hex HeyGen ID
    expect(isUUID('a1777309406040f8b90c19158dab5979')).toBe(true);
    // Standard hyphenated UUID
    expect(isUUID('4499b44b-5180-4d65-9d76-e24405138493')).toBe(true);
    // Invalid IDs
    expect(isUUID('not-a-valid-id')).toBe(false);
    expect(isUUID(12345)).toBe(false);
  });

  it('resolves voice by HeyGen ID and by Cartesia backup ID', async () => {
    const ducBaoHeyGen = await publicVoice('a1777309406040f8b90c19158dab5979');
    expect(ducBaoHeyGen).toBeDefined();
    expect(ducBaoHeyGen?.name).toBe('Đức Bảo');

    const ducBaoCartesia = await publicVoice('4499b44b-5180-4d65-9d76-e24405138493');
    expect(ducBaoCartesia).toBeDefined();
    expect(ducBaoCartesia?.name).toBe('Đức Bảo');
  });

  it('allows specifying preferred provider (heygen or cartesia)', async () => {
    const heygenResolved = await publicVoice('a1777309406040f8b90c19158dab5979', 'heygen');
    expect(heygenResolved?.id).toBe('a1777309406040f8b90c19158dab5979');

    const cartesiaResolved = await publicVoice('a1777309406040f8b90c19158dab5979', 'cartesia');
    expect(cartesiaResolved?.id).toBe('4499b44b-5180-4d65-9d76-e24405138493');
    expect(cartesiaResolved?.provider).toBe('cartesia');
  });

  it('validates speech input with provider option', () => {
    const input = validateSpeech({
      text: 'Xin chào Windi Studio',
      voiceId: 'a1777309406040f8b90c19158dab5979',
      requestKey: '4499b44b-5180-4d65-9d76-e24405138493',
      provider: 'cartesia',
    });
    expect(input.provider).toBe('cartesia');
    expect(input.voiceId).toBe('a1777309406040f8b90c19158dab5979');

    const defaultInput = validateSpeech({
      text: 'Xin chào Windi Studio',
      voiceId: 'a1777309406040f8b90c19158dab5979',
      requestKey: '4499b44b-5180-4d65-9d76-e24405138493',
    });
    expect(defaultInput.provider).toBe('heygen');
  });

  it('handles HeyGen asset upload and instant voice clone flow', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.stubEnv('HEYGEN_API_KEY', 'test_heygen_key');

    try {
      expect(heygenReady()).toBe(true);

      // Mock 1: Upload asset
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { asset_id: 'test_asset_123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Mock 2: Create instant voice clone
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { voice_id: 'b1777309406040f8b90c19158dab5988' } }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Mock 3: Poll voice status
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { status: 'ACTIVE', voice_id: 'b1777309406040f8b90c19158dab5988' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const fakeAudio = Buffer.from('fake_audio_pcm_content');
      const voiceId = await cloneHeyGenVoice(fakeAudio, 'Giọng của tôi');
      expect(voiceId).toBe('b1777309406040f8b90c19158dab5988');

      // Verify asset upload request
      expect(fetchMock).toHaveBeenCalledWith('https://api.heygen.com/v3/assets', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Api-Key': 'test_heygen_key' }),
      }));

      // Verify voice clone request
      expect(fetchMock).toHaveBeenCalledWith('https://api.heygen.com/v3/models/audio/voices', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test_asset_123'),
      }));
    } finally {
      global.fetch = originalFetch;
      vi.unstubAllEnvs();
    }
  });

  it('deletes HeyGen voice correctly via API', async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.stubEnv('HEYGEN_API_KEY', 'test_heygen_key');

    try {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { status: 'ok' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const success = await deleteHeyGenVoice('b1777309406040f8b90c19158dab5988');
      expect(success).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith('https://api.heygen.com/v3/models/audio/voices/b1777309406040f8b90c19158dab5988', expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'X-Api-Key': 'test_heygen_key' }),
      }));
    } finally {
      global.fetch = originalFetch;
      vi.unstubAllEnvs();
    }
  });
});
