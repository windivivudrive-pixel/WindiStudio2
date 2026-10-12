import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveTikTokEncoding,TIKTOK_FPS,TIKTOK_AUDIO_BITRATE} from '../../.local/opencut-classic/apps/web/src/export/tiktok.ts';

async function withEncoder(supports,run){
  const original=globalThis.VideoEncoder,configs=[];
  globalThis.VideoEncoder={isConfigSupported:async config=>{configs.push(config);return {supported:supports(config),config};}};
  try{await run(configs);}finally{if(original===undefined)delete globalThis.VideoEncoder;else globalThis.VideoEncoder=original;}
}
test('selects supported hardware preference without a software retry',async()=>{
  await withEncoder(()=>true,async configs=>{
    const result=await resolveTikTokEncoding({width:1080,height:1920});
    assert.equal(result.hardwareAcceleration,'prefer-hardware');
    assert.equal(result.bitrate,6_000_000);
    assert.equal(result.latencyMode,'quality'); // Do not drop offline export frames.
    assert.equal(configs.length,1);
    assert.deepEqual(TIKTOK_FPS,{numerator:30,denominator:1});
    assert.equal(TIKTOK_AUDIO_BITRATE,128_000);
  });
});
test('falls back to browser automatic selection when hardware preference is unsupported',async()=>{
  await withEncoder(config=>config.hardwareAcceleration==='no-preference',async configs=>{
    const result=await resolveTikTokEncoding({width:1080,height:1920});
    assert.equal(result.hardwareAcceleration,'no-preference');
    assert.deepEqual(configs.map(c=>c.hardwareAcceleration),['prefer-hardware','no-preference']);
  });
});
test('reports unsupported codecs before rendering rather than retrying a whole video',async()=>{
  await withEncoder(()=>false,async configs=>{
    await assert.rejects(resolveTikTokEncoding({width:1080,height:1920}),/H.264/);
    assert.equal(configs.length,2);
  });
});
test('does not stretch or silently resize an incompatible canvas',async()=>{
  await withEncoder(()=>true,async configs=>{
    await assert.rejects(resolveTikTokEncoding({width:1920,height:1080}),/1080/);
    assert.equal(configs.length,0);
  });
});
