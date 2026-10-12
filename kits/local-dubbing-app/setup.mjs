import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {inspectHardware,hardwarePlan,GB} from './hardware.mjs';
import { run } from './process.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
const machine=inspectHardware(root), plan=hardwarePlan(machine);
if(args.includes('--check')){
  console.log(JSON.stringify({machine,plan},null,2));
}else if(args.includes('--engines')){
  console.log(JSON.stringify({machine,plan},null,2));
  if(machine.ramBytes<4*GB)throw new Error('RAM dưới ngưỡng cài local. Dùng chat để nhận diện và API để tạo giọng.');
  if(machine.freeBytes!==null&&machine.freeBytes<6*GB)throw new Error('Cần ít nhất 6 GB trống dự phòng trước khi cài môi trường.');
  const base=process.env.WINDI_PYTHON || (process.platform==='win32'?'python':'python3');
  let settings={};try{settings=JSON.parse(await readFile(join(root,'.windi-dubbing/settings.json'),'utf8'));}catch{}
  const engineIndex=args.indexOf('--engine'), selected=engineIndex<0?null:args[engineIndex+1];
  const chosen=({decode:'whisper',voice:'vieneu'})[selected] || selected;
  if(chosen&&!['whisper','vieneu'].includes(chosen))throw new Error('--engine cần decode hoặc voice.');
  for(const [key,requirement] of [['whisper','openai-whisper==20250625'],['vieneu','vieneu==3.8.1']]){
    if(chosen&&chosen!==key)continue;
    const env=join(root,'.windi-dubbing/envs',key==='whisper'?'decode':'voice');await mkdir(dirname(env),{recursive:true});
    console.log('Chuẩn bị môi trường riêng cho '+(key==='whisper'?'Windi Decode':'Windi TTS')+'…');await run(base,['-m','venv',env]);
    const python=join(env,process.platform==='win32'?'Scripts':'bin',process.platform==='win32'?'python.exe':'python');
    await run(python,['-m','pip','install',requirement,'Pillow>=10,<13',...(key==='whisper'?['yt-dlp']:[])],{timeout:45*60_000,onLine:()=>{}});settings[key]=env;
  }
  await writeFile(join(root,'.windi-dubbing/settings.json'),JSON.stringify(settings,null,2));
  const preferencesFile=join(root,'.windi-dubbing/preferences.json');
  let preferences={};try{preferences=JSON.parse(await readFile(preferencesFile,'utf8'));}catch{}
  preferences.config={...plan.config,...preferences.config};
  await writeFile(preferencesFile,JSON.stringify(preferences,null,2));
  console.log('Đã cài engine riêng cho kit. Model được tải khi chạy lần đầu.');
}else{
  const at=args.indexOf('--project'), project=resolve(at>=0?args[at+1]:process.cwd());
  const target=join(project,'.agents/skills/windi-dubbing');await mkdir(target,{recursive:true});
  const skill=await readFile(join(root,'SKILL.md'),'utf8');
  await writeFile(join(target,'SKILL.md'),skill+'\n\nKit được liên kết trên máy này tại: `'+root+'`. Không cần chép model vào skill.\n');
  console.log('Đã cài skill: '+target+'\nMở lại dự án trong LLM rồi gọi $windi-dubbing.\nKit: '+relative(project,root));
}
