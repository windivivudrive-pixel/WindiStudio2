import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../process.mjs';
test('local worker routes and caches each speaker voice (stub model)',async()=>{
 const root=await mkdtemp(join(tmpdir(),'windi-local-voices-')),out=join(root,'audio');await mkdir(out);
 try{
  await writeFile(join(root,'vieneu.py'),`import pathlib\nclass Vieneu:\n def __init__(self, **kwargs): pass\n def list_preset_voices(self): return [('Host', 'host'), ('Guest', 'guest')]\n def infer(self, text, **kwargs): return kwargs.get('voice', '') + ':' + text\n def save(self, audio, output): pathlib.Path(output).write_text(audio)\n`);
  const request=join(root,'request.json');
  const input={mode:'v3turbo',directory:out,segments:[{id:'a',voice:'host',translation:'Xin chào'},{id:'b',voice:'guest',translation:'Chào bạn'}]};
  await writeFile(request,JSON.stringify(input));
  const worker=join(dirname(fileURLToPath(import.meta.url)),'../workers/engine.py');
  const execute=()=>run(process.platform==='win32'?'python':'python3',[worker,'tts',request],{env:{...process.env,PYTHONPATH:root}});
  await writeFile(join(out,'a.wav.api.json'),'cloud-marker');await execute();
  assert.equal(await readFile(join(out,'a.wav'),'utf8'),'host:Xin chào');assert.equal(await readFile(join(out,'b.wav'),'utf8'),'guest:Chào bạn');await assert.rejects(readFile(join(out,'a.wav.api.json')));
  input.segments[0].voice='guest';await writeFile(request,JSON.stringify(input));await execute();assert.equal(await readFile(join(out,'a.wav'),'utf8'),'guest:Xin chào');
  const sampleRequest={mode:'v3turbo',directory:out,voice:'host',text:'Câu nghe thử'};await writeFile(request,JSON.stringify(sampleRequest));
  const sample=()=>run(process.platform==='win32'?'python':'python3',[worker,'sample',request],{env:{...process.env,PYTHONPATH:root}});
  await sample();assert.equal(await readFile(join(out,'sample.wav'),'utf8'),'host:Câu nghe thử');
  const sdk=await readFile(join(root,'vieneu.py'),'utf8');await writeFile(join(root,'vieneu.py'),'raise RuntimeError("A cached preview must not load the model again")');
  await sample();assert.equal(await readFile(join(out,'sample.wav'),'utf8'),'host:Câu nghe thử');await writeFile(join(root,'vieneu.py'),sdk);
  sampleRequest.voice='guest';await writeFile(request,JSON.stringify(sampleRequest));await sample();assert.equal(await readFile(join(out,'sample.wav'),'utf8'),'guest:Câu nghe thử');
  input.segments[1].voice='missing';await writeFile(request,JSON.stringify(input));await assert.rejects(execute(),/Giọng đã chọn/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('VieNeu v3 catalog reads installed presets per model without importing or downloading the engine',async()=>{
 const root=await mkdtemp(join(tmpdir(),'windi-local-catalog-'));
 try{
  const pkg=join(root,'vieneu'),assets=join(pkg,'assets');await mkdir(assets,{recursive:true});
  await writeFile(join(pkg,'__init__.py'),'raise RuntimeError("The engine must not load for a catalog")');
  await writeFile(join(assets,'voices_v3_turbo.json'),JSON.stringify({default_voice:'Host',presets:{Guest:{description:'Giọng khách mời'},Host:{description:'Giọng MC',featured:1}}}));
  await writeFile(join(assets,'voices_v3_nano.json'),JSON.stringify({presets:{Nano:{description:'Giọng Nano'}}}));
  const request=join(root,'request.json'),output=join(root,'voices.json'),worker=join(dirname(fileURLToPath(import.meta.url)),'../workers/engine.py');
  async function catalog(mode){await writeFile(request,JSON.stringify({mode,output}));await run(process.platform==='win32'?'python':'python3',[worker,'voices',request],{env:{...process.env,PYTHONPATH:root}});return JSON.parse(await readFile(output,'utf8'));}
  const turbo=await catalog('v3turbo');assert.deepEqual(turbo.map(v=>v.id),['Host','Guest']);assert.equal(turbo[0].label,'Host — Giọng MC');assert.equal(turbo[0].default,true);
  assert.deepEqual((await catalog('v3nano')).map(v=>v.id),['Nano']);
 }finally{await rm(root,{recursive:true,force:true});}
});
