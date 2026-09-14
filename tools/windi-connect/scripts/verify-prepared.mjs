import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const release=path.resolve(process.argv[2]);
const home=await mkdtemp(path.join(tmpdir(),'windi-smoke-'));
const node=path.join(release,'runtime',process.platform==='win32'?'node.exe':'bin/node');
const env={...process.env,WINDI_HOME:home};
const daemon=spawn(node,['--no-warnings',path.join(release,'src/daemon.ts')],{env,stdio:['ignore','pipe','pipe']});
let diagnostic='';daemon.stderr.on('data',c=>diagnostic+=c);
try{
  let doctor;
  for(let i=0;i<40;i++){
    if(daemon.exitCode!==null)throw new Error(diagnostic);
    try{doctor=JSON.parse(execFileSync(node,['--no-warnings',path.join(release,'src/cli.ts'),'doctor'],{env,encoding:'utf8',timeout:2000,stdio:['ignore','pipe','pipe']}));break;}catch{await new Promise(resolve=>setTimeout(resolve,200));}
  }
  assert.ok(doctor,'daemon did not answer');
  const setup=JSON.parse(await readFile(path.join(release,'environment.json'),'utf8'));
  const mediaEnv={...env,DYLD_LIBRARY_PATH:setup.media};
  const audio=path.join(home,'test.wav');
  execFileSync(setup.ffmpeg,['-y','-f','lavfi','-i','sine=frequency=440:duration=1',audio],{env:mediaEnv,stdio:'pipe'});
  const sharp=createRequire(path.join(release,'package.json'))('sharp');
  await sharp({create:{width:640,height:360,channels:3,background:'#305060'}}).png().toFile(path.join(release,'renderer/public/smoke.png'));
  const props={title:'Windi install smoke',layout:'paper-editorial',audio:'smoke.wav',beats:[{id:'smoke',startMs:0,endMs:1000,voiceOver:'Windi',onScreenText:'Windi',visualDescription:'Smoke',image:'smoke.png',motion:'none',layout:'text-led',spokenAnchor:'Windi'}],captions:[{text:'Windi',startMs:0,endMs:1000,timestampMs:0,confidence:null}]};
  const {copyFile}=await import('node:fs/promises');
  await copyFile(audio,path.join(release,'renderer/public/smoke.wav'));
  const propsPath=path.join(home,'props.json');await writeFile(propsPath,JSON.stringify(props));
  execFileSync(node,[path.join(release,'renderer/node_modules/@remotion/cli/remotion-cli.js'),'render',path.join(release,'renderer/src/index.ts'),'WindiVideo',path.join(home,'smoke.mp4'),'--props',propsPath,'--frames','0-5','--concurrency','1'],{cwd:path.join(release,'renderer'),env:mediaEnv,stdio:'inherit'});
  execFileSync(setup.ffprobe,['-v','error','-show_entries','stream=codec_name,width,height','-of','json',path.join(home,'smoke.mp4')],{env:mediaEnv,stdio:'inherit'});
  console.log(JSON.stringify({passed:true,home,doctor}));
}finally{daemon.kill();}
