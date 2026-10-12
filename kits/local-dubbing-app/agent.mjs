import { readFile } from 'node:fs/promises';
const [action,id,file]=process.argv.slice(2);
const base=process.env.WINDI_DUBBING_URL || 'http://127.0.0.1:8787';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Bridge phải ở loopback.');
async function api(path,body,method='POST'){
  const r=await fetch(base+path,body!==undefined?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  const x=await r.json();if(!r.ok)throw new Error(x.error);return x;
}
const path=`/api/projects/${id}`;
let result;
if(action==='projects')result=await api('/api/projects');
else if(action==='create')result=await api('/api/projects',{name:id||'Dự án mới'});
else if(action==='inspect')result=await api(path);
else if(action==='context')result=await api(path+'/context');
else if(action==='pending')result=await api(path+'/request');
else if(action==='submit')result=await api(path+'/translation',JSON.parse(await readFile(file,'utf8')));
else if(action==='import-video')result=await api(path+'/import-video',{path:file});
else if(action==='import-transcript'){
  const input=JSON.parse(await readFile(file,'utf8'));
  result=await api(path,{segments:Array.isArray(input)?input:input.segments},'PATCH');
}else if(action==='configure')result=await api(path,JSON.parse(await readFile(file,'utf8')),'PATCH');
else if(action==='job')result=await api(path+'/job',{step:file,...(process.argv[5]?JSON.parse(await readFile(process.argv[5],'utf8')):{})});
else if(action==='cancel')result=await api(path+'/cancel',{});
else if(action==='wait'){
  const deadline=Date.now()+45_000;
  do{result=await api(path);if(result.job?.status!=='running')break;await new Promise(r=>setTimeout(r,1000));}while(Date.now()<deadline);
}else result={usage:[
  'node agent.mjs projects | create "Tên dự án"',
  'node agent.mjs inspect|context|pending PROJECT_ID',
  'node agent.mjs import-video PROJECT_ID /absolute/video.mp4',
  'node agent.mjs import-transcript|configure|submit PROJECT_ID FILE.json',
  'node agent.mjs job PROJECT_ID transcribe|translate|rewrite|tts|render [OPTIONS.json]',
  'node agent.mjs wait|cancel PROJECT_ID'
]};
console.log(JSON.stringify(result,null,2));
