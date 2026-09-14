import {spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {home} from './protocol.ts';
const run=promisify(execFile);
async function dpapi(value:string,encrypt:boolean):Promise<string>{
  const code=`Add-Type -AssemblyName System.Security; $v=[Console]::In.ReadToEnd(); $b=${encrypt?'[Text.Encoding]::UTF8.GetBytes($v)':'[Convert]::FromBase64String($v)'}; $r=[Security.Cryptography.ProtectedData]::${encrypt?'Protect':'Unprotect'}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write(${encrypt?'[Convert]::ToBase64String($r)':'[Text.Encoding]::UTF8.GetString($r)'})`;
  return new Promise((resolve,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',code],{windowsHide:true});
    let output='';child.stdout.on('data',c=>output+=c);child.stderr.resume();
    child.on('error',()=>reject(new Error('Không truy cập được kho token Windows.')));
    child.on('close',status=>status===0?resolve(output):reject(new Error('Không truy cập được kho token Windows.')));
    child.stdin.end(value);
  });
}
export async function readCredential(service:string,account:string){
  if(process.platform==='win32')return dpapi(await readFile(path.join(home,`${service}.dpapi`),'utf8'),false);
  return (await run('/usr/bin/security',['find-generic-password','-a',account,'-s',service,'-w'])).stdout.trim();
}
export async function saveCredential(service:string,account:string,value:string){
  if(process.platform==='win32'){
    await mkdir(home,{recursive:true});await writeFile(path.join(home,`${service}.dpapi`),await dpapi(value,true),{mode:0o600});return;
  }
  await run('/usr/bin/security',['add-generic-password','-U','-a',account,'-s',service,'-w',value]);
}
