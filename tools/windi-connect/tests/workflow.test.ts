import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {approveWorkflow,buildImageManifest,chooseBuiltinLayout,loadWorkflow,putWorkflowArtifact,startWorkflow,validateLayout,validateScript} from '../src/workflow.ts';

const makeProject=async()=>mkdtemp(path.join(tmpdir(),'windi-workflow-'));
const save=async(root:string,name:string,value:unknown)=>{const file=path.join(root,name);await writeFile(file,JSON.stringify(value));return file;};
const ideas={schemaVersion:1,version:1,ideas:[{id:'idea-1',title:'Một chủ đề',hook:'Điều không ai nói',angle:'Giải thích bằng câu chuyện'}]};
const script=(version=1)=>({schemaVersion:1,version,ideaId:'idea-1',title:'Video thử',language:'vi',beats:[{id:'b1',voiceOver:'Đây là lời kể.',onScreenText:'LỜI KỂ',visualDescription:'Một nhân vật bước vào phòng',imagePrompt:'Vertical editorial photograph of a person entering a room',motion:'slow push in',layout:'full-frame',spokenAnchor:'lời kể'}]});
const approveIdeaAndLayout=async(root:string)=>{await putWorkflowArtifact(root,'idea',await save(root,'ideas.json',ideas));await approveWorkflow(root,'idea','idea-1');await chooseBuiltinLayout(root,'paper-editorial');return approveWorkflow(root,'layout','1');};

test('approval gates bind exact idea and script versions',async()=>{
  const root=await makeProject();await startWorkflow(root,'project-1',{topic:'AI cho người mới',audience:'nhà sáng tạo',style:'rõ ràng'});
  const ideaFile=await save(root,'ideas.json',ideas);await putWorkflowArtifact(root,'idea',ideaFile);
  await assert.rejects(()=>approveWorkflow(root,'idea','missing'),/IDEA_NOT_FOUND/);
  const ideaApproved=await approveWorkflow(root,'idea','idea-1');assert.equal(ideaApproved.stage,'layout_review');
  const tooEarlyScript=await save(root,'too-early-script.json',script());await assert.rejects(()=>putWorkflowArtifact(root,'script',tooEarlyScript),/LAYOUT_APPROVAL_REQUIRED/);
  await chooseBuiltinLayout(root,'paper-editorial');
  await assert.rejects(()=>approveWorkflow(root,'layout','2'),/LAYOUT_VERSION_MISMATCH/);
  const layoutApproved=await approveWorkflow(root,'layout','1');assert.equal(layoutApproved.stage,'script_review');
  const scriptFile=await save(root,'script.json',script());await putWorkflowArtifact(root,'script',scriptFile);
  await assert.rejects(()=>approveWorkflow(root,'script','2'),/SCRIPT_VERSION_MISMATCH/);
  const approved=await approveWorkflow(root,'script','1');assert.equal(approved.stage,'assets');
});

test('script revision invalidates every production artifact',async()=>{
  const root=await makeProject();let state=await startWorkflow(root,'project-1',{topic:'T',audience:'A',style:'S'});
  await approveIdeaAndLayout(root);
  await putWorkflowArtifact(root,'script',await save(root,'script.json',script()));state=await approveWorkflow(root,'script','1');
  state.artifacts={imageManifest:'old.json',voice:'voice.mp3',captions:'captions.json',render:'final.mp4',cover:'cover.png',qa:'qa.json'};
  await writeFile(path.join(root,'.windi/workflow.json'),JSON.stringify(state));
  const revised=await putWorkflowArtifact(root,'script',await save(root,'script-v2.json',script(2)));
  assert.equal(revised.stage,'script_review');assert.equal(revised.artifacts.voice,null);assert.equal(revised.invalidated?.reason,'script_version_changed');
});

test('approved script produces deterministic provider manifest',async()=>{
  const root=await makeProject();await startWorkflow(root,'project-1',{topic:'T',audience:'A',style:'S',imageProvider:'chatgpt'});
  await approveIdeaAndLayout(root);
  await putWorkflowArtifact(root,'script',await save(root,'script.json',script()));const state=await approveWorkflow(root,'script','1');
  const first=await buildImageManifest(root,state);const second=await buildImageManifest(root,await loadWorkflow(root));
  assert.equal(first.jobs[0].provider,'chatgpt');assert.equal(first.jobs[0].requestKey,second.jobs[0].requestKey);
  assert.equal(await readFile(path.join(root,first.jobs[0].promptFile),'utf8'),'Vertical editorial photograph of a person entering a room\n');
});

test('script requires every production field per beat',()=>{
  const invalid=script() as any;delete invalid.beats[0].spokenAnchor;
  assert.throws(()=>validateScript(invalid),/INVALID_SPOKEN_ANCHOR/);
});

test('reference layout requires claude-video evidence contract and controls beat layouts',async()=>{
  const root=await makeProject();await startWorkflow(root,'project-1',{topic:'T',audience:'A',style:'S'});await putWorkflowArtifact(root,'idea',await save(root,'ideas.json',ideas));await approveWorkflow(root,'idea','idea-1');
  const layout={schemaVersion:1,version:1,ideaId:'idea-1',id:'viral-reference',name:'Viral reference',source:{kind:'reference',reference:'reference/video.mp4',analyzer:'bradautomates/claude-video',detail:'balanced',evidenceDir:'windi/layout-analysis/viral-reference'},basePreset:'dark-cinematic',summary:'Hook nhanh, ảnh toàn khung và headline giữa.',pacing:{hookDurationMs:1500,averageBeatDurationMs:2800,cutRhythm:'fast'},palette:{background:'#101010',surface:'#202020',text:'#ffffff',accent:'#ff3355',border:'#eeeeee'},captions:{position:'bottom',style:'plain'},sceneTypes:[{id:'viral-hook',role:'hook',composition:'full-bleed',textPosition:'center',imageFit:'cover'}]};
  const evidence=path.join(root,layout.source.evidenceDir);await mkdir(evidence,{recursive:true});await writeFile(path.join(evidence,'transcript.txt'),'[00:00] Hook');
  assert.equal(validateLayout(layout).source.kind,'reference');await putWorkflowArtifact(root,'layout',await save(root,'layout.json',layout));await approveWorkflow(root,'layout','1');
  const invalid=script();invalid.beats[0].layout='full-frame';const wrongLayoutScript=await save(root,'wrong-layout-script.json',invalid);await assert.rejects(()=>putWorkflowArtifact(root,'script',wrongLayoutScript),/UNKNOWN_BEAT_LAYOUT_full-frame/);
  invalid.beats[0].layout='viral-hook';const accepted=await putWorkflowArtifact(root,'script',await save(root,'reference-script.json',invalid));assert.equal(accepted.stage,'script_review');
});
