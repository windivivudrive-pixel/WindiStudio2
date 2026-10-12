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
  await writeFile(join(root,'vieneu.py'),`import wave,struct
class Vieneu:
 def __init__(self, mode='v3turbo', **kwargs): self.sample_rate=48000 if mode=='v3turbo' else 24000
 def list_preset_voices(self): return [('Host', 'host'), ('Guest', 'guest')]
 def infer(self, text, **kwargs): return [0]*4800
 def save(self, audio, output):
  with wave.open(output,'wb') as w:
   w.setnchannels(1);w.setsampwidth(2);w.setframerate(self.sample_rate);w.writeframes(struct.pack('<h',1000)*len(audio))
`);
  const request=join(root,'request.json');
  const input={mode:'v3turbo',directory:out,segments:[{id:'a',voice:'host',translation:'Xin chào'},{id:'b',voice:'guest',translation:'Chào bạn'}]};
  await writeFile(request,JSON.stringify(input));
  const worker=join(dirname(fileURLToPath(import.meta.url)),'../workers/engine.py');
  const execute=()=>run(process.platform==='win32'?'python':'python3',[worker,'tts',request],{env:{...process.env,PYTHONPATH:root}});
  await writeFile(join(out,'a.wav.api.json'),'cloud-marker');await execute();
  const meta=async name=>JSON.parse(await readFile(join(out,name+'.wav.audio.json'),'utf8'));assert.equal((await meta('a')).voice,'host');assert.equal((await meta('b')).voice,'guest');assert.equal((await meta('a')).sampleRate,48000);await assert.rejects(readFile(join(out,'a.wav.api.json')));
  input.segments[0].voice='guest';await writeFile(request,JSON.stringify(input));await execute();assert.equal((await meta('a')).voice,'guest');
  const sampleRequest={mode:'v3turbo',directory:out,voice:'host',text:'Câu nghe thử'};await writeFile(request,JSON.stringify(sampleRequest));
  const sample=()=>run(process.platform==='win32'?'python':'python3',[worker,'sample',request],{env:{...process.env,PYTHONPATH:root}});
  await sample();assert.equal((await meta('sample')).voice,'host');
  const sdk=await readFile(join(root,'vieneu.py'),'utf8');await writeFile(join(root,'vieneu.py'),'raise RuntimeError("A cached preview must not load the model again")');
  await sample();assert.equal((await meta('sample')).voice,'host');await writeFile(join(root,'vieneu.py'),sdk);
  sampleRequest.voice='guest';await writeFile(request,JSON.stringify(sampleRequest));await sample();assert.equal((await meta('sample')).voice,'guest');
  // Switching models must use its own sample rate and never reuse another model's cache.
  sampleRequest.mode='v3nano';await writeFile(request,JSON.stringify(sampleRequest));await sample();assert.equal((await meta('sample')).sampleRate,24000);
  // Simulate a broken SDK saving Pro data under a Lite-rate WAV header.
  await writeFile(join(root,'vieneu.py'),sdk.replace('w.setframerate(self.sample_rate)','w.setframerate(24000)'));
  sampleRequest.mode='v3turbo';sampleRequest.text='Uncached rate mismatch';await writeFile(request,JSON.stringify(sampleRequest));await assert.rejects(sample(),/Sample rate/);await writeFile(join(root,'vieneu.py'),sdk);
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
