import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FLOW_VOICE_ID,resolveFlowVoice} from '../src/voice-default.ts';
test('Flow chooses fallback only for missing settings',()=>{
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  assert.deepEqual(resolveFlowVoice('  ',' ',undefined),{voiceId:DEFAULT_FLOW_VOICE_ID,source:'default'});
  assert.equal(resolveFlowVoice(` ${a} `,b,b).voiceId,a);
  assert.equal(resolveFlowVoice(undefined,a,b).voiceId,a);
  assert.equal(resolveFlowVoice(undefined,undefined,b).voiceId,b);
  assert.throws(()=>resolveFlowVoice('invalid',a),/INVALID_VOICE_ID/);
  assert.throws(()=>resolveFlowVoice(undefined,'invalid',a),/INVALID_VOICE_ID/);
});
