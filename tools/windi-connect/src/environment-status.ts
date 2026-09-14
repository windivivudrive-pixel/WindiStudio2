import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
export async function environmentStatus(){
  try{
    const setup=JSON.parse(await readFile(new URL('../environment.json',import.meta.url),'utf8'));
    const checks=await Promise.all([['python',setup.python,['--version']],['ffmpeg',setup.ffmpeg,['-version']],['ffprobe',setup.ffprobe,['-version']],['ytDlp',setup.python,['-m','yt_dlp','--version']]].map(async([name,file,args])=>{
      try{const result=await run(file as string,args as string[],{timeout:5000});return [name,{ready:true,version:result.stdout.trim().split('\n')[0]}];}
      catch{return [name,{ready:false}];}
    }));
    const tools=Object.fromEntries(checks);
    return {managed:true,node:process.version,ready:Object.values(tools).every((value:any)=>value.ready),tools};
  }catch{return {managed:false,node:process.version,ready:false,remedy:'Chạy lại bộ cài Windi để chuẩn bị môi trường.'};}
}
