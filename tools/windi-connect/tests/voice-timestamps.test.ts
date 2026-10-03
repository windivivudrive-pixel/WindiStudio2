import {test} from 'node:test';
import assert from 'node:assert/strict';
import {captionsFromWords} from '../src/voice-api.ts';
import {validateCaptions} from '../src/workflow.ts';

test('Windi word timestamps directly produce valid subtitles without losing short words',()=>{
  const captions=captionsFromWords({words:['Xin','chào','thì'],start:[0,0.2,0.5011],end:[0.18,0.5,0.5012]});
  assert.equal(validateCaptions(captions).length,3);
  assert.deepEqual(captions[0],{text:'Xin',startMs:0,endMs:180,timestampMs:0,confidence:null});
  assert.equal(captions[2].endMs-captions[2].startMs,1);
});
test('missing, mismatched, empty, or out-of-order timestamps fail instead of omitting spoken words',()=>{
  for(const timing of [{},{words:['Xin'],start:[0],end:[]},{words:[' '],start:[0],end:[1]},{words:['Xin'],start:[-1],end:[0]},{words:['Xin','chào'],start:[1,0],end:[2,1]},{words:['Xin'],start:[0],end:[NaN]}]) assert.throws(()=>captionsFromWords(timing),/VOICE_API_TIMESTAMP/);
});
