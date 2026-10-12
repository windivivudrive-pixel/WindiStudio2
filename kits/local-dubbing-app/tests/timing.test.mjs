import test from 'node:test';
import assert from 'node:assert/strict';
import {timingPlan,audioInfo,assertLocalSampleRate} from '../timing.mjs';
test('short voice never slows; longer voice balances time; rewrite thresholds and sample counts stay correct',()=>{
 const short=timingPlan(5,4.2);assert.equal(short.audioTempo,1);assert.equal(short.outputDuration,5);assert.equal(short.voiceDuration,4.2);assert.equal(short.rewriteRecommended,true);
 const long=timingPlan(5,5.5);assert.ok(Math.abs(long.outputDuration-5.5/long.audioTempo)<1e-8);assert.equal(long.rewriteRecommended,false);
 assert.equal(timingPlan(5,6.1).requiresRewrite,true);assert.equal(timingPlan(5,3.9).requiresRewrite,true);
 for(const rate of [24000,48000])assert.equal(audioInfo({streams:[{codec_type:'audio',sample_rate:String(rate),channels:1,duration_ts:rate*2,time_base:'1/'+rate}],format:{duration:'999'}}).duration,2);
 assert.throws(()=>audioInfo({streams:[],format:{duration:'2'}}));assert.throws(()=>timingPlan(0,1));
 assert.throws(()=>assertLocalSampleRate({ttsProvider:'local',mode:'v3turbo'},{sampleRate:24000}),/Sample rate/);
 assert.doesNotThrow(()=>assertLocalSampleRate({ttsProvider:'local',mode:'v3nano'},{sampleRate:24000}));
});
