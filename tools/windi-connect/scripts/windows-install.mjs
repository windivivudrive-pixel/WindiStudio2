import {mkdir,writeFile,cp} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import path from 'node:path';
const ps=value=>"'"+value.replaceAll("'","''")+"'";
export async function finishWindows({home,release,releaseNode,connections,environment,watchSkills=[]}){
  const bin=path.join(home,'bin');await mkdir(bin,{recursive:true});
  const cmd=(file,args='')=>`@echo off\r\nset "PATH=${environment.media};${environment.pythonBin};${path.dirname(releaseNode)};%PATH%"\r\n"${file}" ${args} %*\r\n`;
  await writeFile(path.join(bin,'windi.cmd'),cmd(releaseNode,`--no-warnings "${path.join(release,'src/cli.ts')}"`));
  for(const [name,file] of [['python',environment.python],['python3',environment.python],['ffmpeg',environment.ffmpeg],['ffprobe',environment.ffprobe],['yt-dlp',path.join(environment.pythonBin,'yt-dlp.exe')]])await writeFile(path.join(bin,`windi-${name}.cmd`),cmd(file));
  const visibleExtension=path.join(bin,'Windi Connect Extension');
  await cp(path.join(home,'extensions','windi'),visibleExtension,{recursive:true,force:true});
  const manifests=path.join(home,'native-hosts');await mkdir(manifests,{recursive:true});
  for(const provider of ['flow','chatgpt']){
    const name=`com.windistudio.connect.${provider}`,launcher=path.join(release,`native-${provider}.cmd`);
    await writeFile(launcher,cmd(releaseNode,`--no-warnings "${path.join(release,'src/native.ts')}" ${provider}`));
    const manifest=path.join(manifests,`${name}.json`);
    await writeFile(manifest,JSON.stringify({name,description:'Windi Connect',path:launcher,type:'stdio',allowed_origins:[connections.windi,connections[provider]].map(id=>`chrome-extension://${id}/`)}));
    for(const browser of ['Google\\Chrome','CocCoc\\Browser'])execFileSync('reg.exe',['add',`HKCU\\Software\\${browser}\\NativeMessagingHosts\\${name}`,'/ve','/t','REG_SZ','/d',manifest,'/f'],{stdio:'pipe'});
  }
  const script=`$bin=${ps(bin)}; $p=[Environment]::GetEnvironmentVariable('Path','User'); if (($p -split ';') -notcontains $bin) {[Environment]::SetEnvironmentVariable('Path',($bin+';'+$p),'User')}`;
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{stdio:'pipe'});
  // Per-user startup, no administrator or machine-wide service needed.
  const startup=path.join(process.env.APPDATA,'Microsoft/Windows/Start Menu/Programs/Startup');await mkdir(startup,{recursive:true});
  const daemon=path.join(release,'src/daemon.ts');
  const command=`"${releaseNode}" --no-warnings "${daemon}"`;
  await writeFile(path.join(startup,'WindiConnect.vbs'),`CreateObject("WScript.Shell").Run "${command.replaceAll('"','""')}", 0, False\r\n`);
  const child=spawn(releaseNode,['--no-warnings',daemon],{detached:true,stdio:'ignore',windowsHide:true});child.unref();
  let ready=false;
  for(let i=0;i<30;i++){try{execFileSync(releaseNode,['--no-warnings',path.join(release,'src/cli.ts'),'doctor'],{stdio:'pipe',timeout:3000});ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
  if(!ready)throw new Error('Windi chưa khởi động được. Chạy lại bộ cài để sửa môi trường.');
  const preserved=watchSkills.filter(skill=>skill.status==='kept-existing').map(skill=>skill.target);
  if(preserved.length)console.log(`Đã giữ nguyên skill watch có sẵn: ${preserved.join(', ')}`);
  console.log(`Đã cài Windi. Trong thư mục đang mở, chọn “Windi Connect Extension” khi Load unpacked: ${visibleExtension}`);
}
