import {expect,test,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {voiceDisplayText} from '../lib/voice/branding';
vi.mock('server-only',()=>({}));
import {failure,VoiceError} from '../lib/voice/server';

test('service errors sanitize upstream branding and URLs',async()=>{
  expect(voiceDisplayText('Cartesia: https://api.cartesia.ai/tts/sse failed')).toBe('Windi Clone Pro 2.1: Windi Clone Pro 2.1 failed');
  const response=failure(new VoiceError('CARTESIA unavailable',503));
  expect(await response.json()).toEqual({error:'Windi Clone Pro 2.1 unavailable'});
});

test('customer and admin voice components expose only the service brand',()=>{
  for(const file of ['windi/voice-studio.tsx','windi/voice-admin-panel.tsx','windi/video-kit-commerce.tsx','windi/video-kit-preview.tsx','windi/voice-api-tokens.tsx','app/voice-studio/page.tsx']){
    expect(readFileSync(file,'utf8')).not.toMatch(/cartesia|sonic/i);
  }
});

test('upstream model names, key labels, and URLs use the complete Windi brand',()=>{
  for(const value of ['Sonic 3.6','sonic-3.6','CARTESIA_API_KEY','https://docs.cartesia.ai/models','Clone Pro 2.1']) expect(voiceDisplayText(value)).toBe('Windi Clone Pro 2.1');
  expect(voiceDisplayText('Windi Clone Pro 2.1')).toBe('Windi Clone Pro 2.1');
});
