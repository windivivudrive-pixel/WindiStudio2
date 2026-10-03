import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import type {Provider} from './protocol.ts';

type Profile=Partial<Record<Provider,string>>;
export async function loadProfile(file:string):Promise<Profile>{
  let raw:string;
  try{raw=await readFile(file,'utf8');}catch(error){
    if((error as NodeJS.ErrnoException).code==='ENOENT')return {};
    throw error;
  }
  try{
    const value=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid profile');
    const profile:Profile={};
    for(const key of ['flow','chatgpt','grok'] as Provider[]){
      if(value[key]!==undefined){
        if(typeof value[key]!=='string'||!value[key])throw new Error('Invalid profile entry');
        profile[key]=value[key];
      }
    }
    return profile;
  }catch{
    const backup=`${file}.corrupt-${randomUUID()}.bak`;
    await rename(file,backup);
    console.error(`Recovered invalid Windi profile. Backup: ${backup}. Reconnect browser extensions.`);
    return {};
  }
}

export function profileWriter(file:string){
  let pending=Promise.resolve();
  return (profile:Profile)=>{
    const data=JSON.stringify(profile);
    const save=pending.then(async()=>{
      const temporary=`${file}.${randomUUID()}.tmp`;
      try{
        await writeFile(temporary,data,{mode:0o600,flag:'wx'});
        await rename(temporary,file);
      }finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}
    });
    pending=save.catch(()=>{});
    return save;
  };
}
