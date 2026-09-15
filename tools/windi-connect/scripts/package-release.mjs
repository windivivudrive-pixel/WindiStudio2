import {writeFile,readFile,readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.resolve(root,'../../package.json'));
const JSZip=require('jszip');
const {version}=require(path.join(root,'package.json'));
const zip=new JSZip();
async function add(directory,prefix){
  for(const item of await readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,item.name),name=prefix+item.name;
    if(item.isSymbolicLink())throw new Error(`Unexpected symlink: ${name}`);
    if(item.isDirectory()){if(item.name==='node_modules')throw new Error('Dependencies must not be bundled');await add(file,name+'/');}
    else zip.file(name,await readFile(file),{unixPermissions:(await lstat(file)).mode});
  }
}
await add(path.join(root,'dist/Windi Connect Installer.app'),'Windi Connect Installer.app/');
zip.file('Cai Windi Windows.cmd','@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Windi Connect Installer.app\\Contents\\Resources\\windi-connect\\scripts\\bootstrap.ps1"\r\n');
zip.file('HUONG-DAN.txt','Giải nén toàn bộ ZIP. Windows 10/11 x64: mở Cai Windi Windows.cmd. macOS Intel/Apple Silicon: mở Windi Connect Installer.app. Cần Internet lần cài đầu. Bộ cài tự chuẩn bị Node, Python, FFmpeg, ffprobe, yt-dlp và renderer. Mở terminal mới sau cài. Tài khoản chưa ghép: chạy windi login với mã Workflow của bạn. Windows: cần kiểm thử trên máy Windows trước khi xác nhận hỗ trợ production.');
const output=path.join(root,'dist',`Windi-Video-Workflow-v${version}-universal.zip`);
await writeFile(output,await zip.generateAsync({type:'nodebuffer',platform:'UNIX',compression:'DEFLATE',compressionOptions:{level:9}}));
console.log(output);
