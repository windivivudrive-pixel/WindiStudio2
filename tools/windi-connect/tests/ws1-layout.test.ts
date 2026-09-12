import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLayout} from '../src/workflow.ts';
import {ws1CaptionGroups} from '../../../kits/video-starter/src/ws1-captions.ts';
const layout={schemaVersion:1,version:1,ideaId:'test',id:'ws1-reference-hybrid-flow',name:'WS1',renderer:'ws1-reference-hybrid-flow',source:{kind:'builtin',preset:'dark-cinematic'},basePreset:'dark-cinematic',summary:'WS1 blue grid',pacing:{hookDurationMs:3000,averageBeatDurationMs:4000,cutRhythm:'spoken anchors'},palette:{background:'#081a2a',surface:'#102b3a',text:'#f3f0df',accent:'#ff6f9d',border:'#9bc8c3'},captions:{position:'bottom',style:'boxed'},sceneTypes:[{id:'hook',role:'hook',composition:'framed',textPosition:'top',imageFit:'cover'}],imageIdentityLock:{medium:'photorealistic',characterScope:'project'}};
test('WS1 renderer and image identity survive layout registration',()=>{
  const saved=validateLayout(layout);assert.equal(saved.renderer,layout.renderer);assert.deepEqual(saved.imageIdentityLock,layout.imageIdentityLock);
  assert.throws(()=>validateLayout({...layout,renderer:'unimplemented'}),/UNSUPPORTED_LAYOUT_RENDERER/);
});
test('WS1 partitions uninterrupted narration into 4–9 word pages without loss',()=>{
  for(let n=4;n<=250;n++){
    const captions=Array.from({length:n},(_,i)=>({text:`word${i}${i%6===5?'.':''}`,startMs:i*200,endMs:(i+1)*200,timestampMs:i*200,confidence:null}));
    const groups=ws1CaptionGroups(captions);assert.ok(groups.every(g=>g.length>=4&&g.length<=9));assert.deepEqual(groups.flat(),captions);
  }
});
