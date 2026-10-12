import { readFile, writeFile } from 'node:fs/promises';
const [action,id,file]=process.argv.slice(2);
const base=process.env.WINDI_DUBBING_URL || 'http://127.0.0.1:8787';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error('Bridge phải ở loopback.');
async function api(path,body){const r=await fetch(base+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const x=await r.json();if(!r.ok)throw new Error(x.error);return x;}
if(action==='projects')console.log(JSON.stringify(await api('/api/projects'),null,2));
else if(action==='pending')console.log(JSON.stringify(await api(`/api/projects/${id}/request`),null,2));
else if(action==='submit')console.log(JSON.stringify(await api(`/api/projects/${id}/translation`,JSON.parse(await readFile(file,'utf8'))),null,2));
else console.log('node agent.mjs projects | pending <project-id> | submit <project-id> <translations.json>');
