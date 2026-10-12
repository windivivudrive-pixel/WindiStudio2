import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateTranslations } from '../providers.mjs';
import { resolveRuntime, inspectRuntime } from '../runtime.mjs';
import { run } from '../process.mjs';
const root=mkdtempSync(join(tmpdir(),'windi-dub-test-'));process.env.WINDI_DUBBING_DATA=root;
const p=await import('../pipeline.mjs');
process.on('exit',()=>rmSync(root,{recursive:true,force:true}));
const rows=[{id:'a',start:0,end:1,text:'Hello',translation:''},{id:'b',start:2,end:3,text:'World',translation:''}];
test('translation IDs are complete, unique, immutable, nonempty',()=>{
 assert.deepEqual(validateTranslations(rows,{segments:[{id:'b',translation:'Thế giới'},{id:'a',translation:'Xin chào'}]}).map(s=>s.id),['a','b']);
 for(const input of [[],[{id:'a',translation:'x'}],[{id:'a',translation:'x'},{id:'a',translation:'y'}],[{id:'a',translation:''},{id:'b',translation:'y'}],[{id:'a',translation:'x'},{id:'c',translation:'y'}]])assert.throws(()=>validateTranslations(rows,{segments:input}));
});
test('timeline rejects overlap, NaN, unsafe IDs and out-of-video times',()=>{
 assert.equal(p.validateSegments(rows,4).length,2);
 for(const invalid of [[{...rows[0],id:'../x'}],[{...rows[0],start:NaN}],[rows[1],rows[0]],[{...rows[0],end:10}]])assert.throws(()=>p.validateSegments(invalid,4));
});
test('edits persist and invalidate dependent artifacts, stale translations fail',()=>{
 const project=p.createProject('sample');project.video={duration:4};project.segments=rows;project.artifacts={tts:{runtime:''},render:{mp4:'old.mp4'}};p.saveProject(project);
 const edited=p.updateProject(project.id,{segments:rows});assert.equal(edited.revision,1);assert.equal(edited.artifacts.tts,undefined);assert.equal(edited.artifacts.render,undefined);
 edited.pendingTranslation={revision:1};p.saveProject(edited);
 assert.throws(()=>p.importTranslation(edited.id,{revision:0,segments:[]}));
 const translated=p.importTranslation(edited.id,{revision:1,segments:[{id:'a',translation:'Xin chào'},{id:'b',translation:'Thế giới'}]});assert.equal(translated.revision,2);assert.equal(p.getProject(edited.id).segments[0].translation,'Xin chào');
});
test('subtitle output supports Vietnamese and strips ASS control injection',()=>{
 const config={color:'#ffe083',fontSize:44,subtitle:'outline'};
 const segments=[{start:1.23,end:3,translation:'Xin chào {\\pos(0,0)}\nViệt Nam'}];
 assert.match(p.srt(segments),/00:00:01,230/);assert.ok(!p.ass(segments,config).includes('{\\pos'));assert.match(p.ass(segments,config),/Việt Nam/);
});
test('cancel terminates spawned process promptly',async()=>{
 const c=new AbortController();const pending=run(process.execPath,['-e','setTimeout(()=>{},60000)'],{signal:c.signal});setTimeout(()=>c.abort(),30);await assert.rejects(pending,/hủy/);
});
test('Python runtime probing reads both module flags and rejects relative executable',()=>{assert.throws(()=>resolveRuntime('relative/python'));const status=inspectRuntime(resolveRuntime());assert.equal(typeof status.whisper,'boolean');assert.equal(typeof status.vieneu,'boolean');});
test('legacy projects migrate speaker defaults without losing their selected voice',()=>{
 const project=p.createProject();delete project.speakers;delete project.config.ttsProvider;delete project.config.apiModel;project.config.voice='bao-long';project.segments=rows;p.saveProject(project);
 const restored=p.getProject(project.id);assert.equal(restored.config.ttsProvider,'local');assert.equal(restored.speakers[0].voice,'bao-long');assert.equal(restored.segments[0].speaker,'speaker_1');
 const cleared=p.updateProject(project.id,{speakers:[{id:'speaker_1',name:'MC',voice:''}]});assert.equal(p.voicedSegments(cleared)[0].voice,'');
});
test('speaker labels survive import and translation and select distinct voices',()=>{
 const project=p.createProject();const input=rows.map((s,i)=>({...s,speaker_id:i?'guest':'host'}));
 let saved=p.updateProject(project.id,{segments:input});assert.equal(saved.segments[1].speaker,'guest');
 saved=p.updateProject(project.id,{speakers:[{id:'host',name:'MC',voice:'voice-a'},{id:'guest',name:'Khách mời',voice:'voice-b'}]});
 assert.deepEqual(p.voicedSegments(saved).map(s=>s.voice),['voice-a','voice-b']);
 assert.equal(validateTranslations(saved.segments,{segments:rows.map(s=>({id:s.id,translation:'Xin chào'}))})[1].speaker,'guest');
 assert.throws(()=>p.updateProject(project.id,{speakers:[saved.speakers[0]]}),/Gán lại/);
 assert.equal(p.getProject(project.id).speakers.length,2);
 saved.artifacts={tts:{},samples:{host:'sample/host/sample.wav'},render:{mp4:'old'}};saved.segments[0].ratio=1;p.saveProject(saved);
 saved=p.updateProject(project.id,{speakers:saved.speakers.map(s=>({...s,voice:s.id==='host'?'new':s.voice}))});
 assert.deepEqual(saved.artifacts,{});assert.equal(saved.segments[0].ratio,undefined);
 saved=p.updateProject(project.id,{config:{ttsProvider:'elevenlabs'}});assert.equal(saved.speakers[0].voice,'');assert.throws(()=>p.voicedSegments(saved),/Chọn giọng riêng/);
});
test('speaker validation is bounded and does not accept paths or duplicate IDs',()=>{
 for(const input of [[],[{id:'../a',name:'A',voice:''}],[{id:'a',name:'',voice:''}],[{id:'a',name:'A',voice:''},{id:'a',name:'B',voice:''}],Array.from({length:21},(_,i)=>({id:String(i),name:'A',voice:''}))])assert.throws(()=>p.validateSpeakers(input));
 assert.throws(()=>p.validateSegments([{...rows[0],speaker:'../bad'}],4));
});
test('one/two voice selection keeps transcript content and maps removed roles to the shared voice',()=>{
 let project=p.createProject();project=p.updateProject(project.id,{segments:rows});
 project=p.updateProject(project.id,{speakerCount:2});
 assert.equal(project.speakers.length,2);assert.deepEqual(project.speakers.map(s=>s.name),['MC','Khách mời']);
 project=p.updateProject(project.id,{speakers:project.speakers.map((s,i)=>({...s,voice:i?'guest-voice':'host-voice'})),segments:project.segments.map((s,i)=>({...s,speaker:project.speakers[i].id}))});
 project.artifacts={tts:{},samples:{guest:'old'},render:{}};p.saveProject(project);
 project=p.updateProject(project.id,{speakerCount:1});
 assert.equal(project.speakers.length,1);assert.ok(project.segments.every(s=>s.speaker===project.speakers[0].id));
 assert.deepEqual(project.segments.map(s=>[s.id,s.text,s.start,s.end]),rows.map(s=>[s.id,s.text,s.start,s.end]));
 assert.deepEqual(p.voicedSegments(project).map(s=>s.voice),['host-voice','host-voice']);assert.deepEqual(project.artifacts,{});
 assert.equal(p.getProject(project.id).speakers.length,1);
 for(const count of [0,3,'2',null])assert.throws(()=>p.updateProject(project.id,{speakerCount:count}),/Chọn 1 giọng/);
});
test('sample sentence persists independently of the full dubbed audio and requires a selected preview voice',async()=>{
 let project=p.createProject();project.artifacts={tts:{provider:'local'},render:{mp4:'valid'},samples:{speaker_1:'old'}};p.saveProject(project);
 project=p.updateProject(project.id,{config:{sampleText:'Xin chào, đây là câu thử mới.'}});
 assert.equal(p.getProject(project.id).config.sampleText,'Xin chào, đây là câu thử mới.');
 assert.equal(project.artifacts.samples,undefined);assert.ok(project.artifacts.tts);assert.ok(project.artifacts.render);
 assert.throws(()=>p.updateProject(project.id,{config:{sampleText:'  '}}),/Câu nghe thử/);
 p.startJob(project.id,'sample',{vieneu:''});
 for(let i=0;i<100;i++){project=p.getProject(project.id);if(project.job.status!=='running')break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(project.job.status,'error');assert.match(project.job.message,/Chọn giọng/);
});


test('local engine failure gives actionable feedback without exposing SDK tracebacks',async()=>{
 const fixture=mkdtempSync(join(tmpdir(),'windi-engine-error-'));
 const previous=process.env.PYTHONPATH;
 try{
  writeFileSync(join(fixture,'vieneu.py'),'raise RuntimeError("vieneu whisper secret-model /private/internal")');
  process.env.PYTHONPATH=fixture;
  let project=p.createProject('Engine error');
  p.startJob(project.id,'voices',{vieneu:''});
  for(let i=0;i<200;i++){project=p.getProject(project.id);if(project.job.status!=='running')break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(project.job.status,'error');
  assert.match(project.job.message,/Windi TTS.*Kiểm tra môi trường local/);
  assert.doesNotMatch(project.job.message,/vieneu|whisper|secret-model|Traceback|private\/internal/i);
 }finally{if(previous===undefined)delete process.env.PYTHONPATH;else process.env.PYTHONPATH=previous;rmSync(fixture,{recursive:true,force:true});}
});
