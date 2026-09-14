import {mkdir,readFile,writeFile,access,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

export const uvAssets={
  'darwin-arm64':['aarch64-apple-darwin.tar.gz','7e6ddb9316acc00f2296c82ff4d99977870ee34b2f0ddcae9444d714db9364ed'],
  'darwin-x64':['x86_64-apple-darwin.tar.gz','5e287ef61cb6a9b61b3a83fef124fd143e400468a7dac794230147a810e17119'],
  'win32-x64':['x86_64-pc-windows-msvc.zip','a86c9dc7bad9b03f388583b7187c05fe9951c2e0d392217e8fd43d97787f6ec2'],
};
export async function checkedDownload(url,destination,sha256){
  const response=await fetch(url,{signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error(`Tải môi trường thất bại: HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==sha256)throw new Error('Checksum môi trường không khớp. Dừng cài đặt.');
  await writeFile(destination,bytes);
}
export async function prepareEnvironment(release,{managedPython=false}={}){
  const windows=process.platform==='win32';
  const media=path.join(release,'renderer','node_modules','@remotion',`compositor-${process.platform}-${process.arch}${windows?'-msvc':''}`);
  const ffmpeg=path.join(media,windows?'ffmpeg.exe':'ffmpeg');
  const ffprobe=path.join(media,windows?'ffprobe.exe':'ffprobe');
  await access(ffmpeg);await access(ffprobe);
  const env={...process.env,PATH:[path.join(release,'runtime',windows?'':'bin'),media,process.env.PATH].filter(Boolean).join(path.delimiter),DYLD_LIBRARY_PATH:media};
  const run=(bin,args,options={})=>execFileSync(bin,args,{env,stdio:'inherit',...options});
  run(ffmpeg,['-version'],{stdio:'pipe'});run(ffprobe,['-version'],{stdio:'pipe'});
  const tools=path.join(release,'tools');await mkdir(tools,{recursive:true});
  const uv=path.join(tools,windows?'uv.exe':'uv');
  if(!await access(uv).then(()=>true).catch(()=>false)){
    const asset=uvAssets[`${process.platform}-${process.arch}`];
    if(!asset)throw new Error('Hệ điều hành hoặc CPU chưa được hỗ trợ.');
    const archive=path.join(tools,windows?'uv.zip':'uv.tar.gz');
    await checkedDownload(`https://github.com/astral-sh/uv/releases/download/0.12.13/uv-${asset[0]}`,archive,asset[1]);
    if(windows)run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${archive.replaceAll("'","''")}' -DestinationPath '${tools.replaceAll("'","''")}' -Force`]);
    else run('/usr/bin/tar',['-xzf',archive,'--strip-components=1','-C',tools]);
    await rm(archive);
  }
  const pythonHome=path.join(release,'python-runtime');env.UV_PYTHON_INSTALL_DIR=pythonHome;
  let existingPython;
  for(const executable of managedPython?[]:windows?['python','py']:['python3']){
    try{existingPython=run(executable,['-c','import sys; assert sys.version_info >= (3,10); print(sys.executable)'],{stdio:'pipe',encoding:'utf8',timeout:5000}).trim();break;}catch{}
  }
  const venv=path.join(release,'python');
  if(!existingPython){console.log('Đang tự cài Python 3.12 cho Windi…');run(uv,['python','install','3.12.12','--no-bin','--no-registry']);}
  run(uv,['venv','--python',existingPython||'3.12.12','--allow-existing',venv]);
  const python=path.join(venv,windows?'Scripts':'bin',windows?'python.exe':'python');
  run(uv,['pip','install','--python',python,'yt-dlp==2026.8.19']);
  run(python,['-c','import sys; assert sys.version_info >= (3,10); import yt_dlp']);
  const result={python,ffmpeg,ffprobe,media,pythonBin:path.dirname(python)};
  await writeFile(path.join(release,'environment.json'),JSON.stringify(result,null,2));
  return result;
}
