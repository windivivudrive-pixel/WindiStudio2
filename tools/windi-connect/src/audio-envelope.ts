import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile);
/** RMS samples every 20ms; generated from the same full mix used by the render. */
export async function audioEnvelope(file:string){
  const {stdout}=await run(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',file,'-f','f32le','-ac','1','-ar','8000','pipe:1'],{encoding:'buffer',maxBuffer:64*1024*1024});
  const result:number[]=[];
  for(let offset=0;offset<stdout.length;offset+=640){let sum=0,count=0;for(let j=offset;j+4<=Math.min(offset+640,stdout.length);j+=4){const v=stdout.readFloatLE(j);sum+=v*v;count++;}result.push(Math.sqrt(sum/Math.max(1,count)));}
  const peak=Math.max(.01,...result);
  return result.map(v=>Math.round(Math.min(1,v/peak)*1000)/1000);
}
