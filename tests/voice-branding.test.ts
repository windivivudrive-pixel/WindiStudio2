import {expect,test,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {voiceDisplayText} from '../lib/voice/branding';
vi.mock('server-only',()=>({}));
import {failure,VoiceError} from '../lib/voice/server';

test('service errors sanitize upstream branding and URLs',async()=>{
  expect(voiceDisplayText('Cartesia: https://api.cartesia.ai/tts/sse failed')).toBe('Clone Pro 2.1: Clone Pro 2.1 failed');
  const response=failure(new VoiceError('CARTESIA unavailable',503));
  expect(await response.json()).toEqual({error:'Clone Pro 2.1 unavailable'});
});

test('customer and admin voice components expose only the service brand',()=>{
  for(const file of ['windi/voice-studio.tsx','windi/voice-admin-panel.tsx','windi/video-kit-commerce.tsx']){
    expect(readFileSync(file,'utf8')).not.toMatch(/cartesia/i);
  }
});
