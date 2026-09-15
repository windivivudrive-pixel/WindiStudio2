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
await add(path.join(root,'dist/extensions/windi'),'Windi Connect Extension/');
zip.file('Cai Windi Windows.cmd','@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Windi Connect Installer.app\\Contents\\Resources\\windi-connect\\scripts\\bootstrap.ps1"\r\n');
zip.file('HUONG-DAN.txt',`WINDI CONNECT — BẮT ĐẦU NHANH (WINDOWS)

BƯỚC 1 — CÀI Windi Connect
1. Giải nén toàn bộ ZIP.
2. Mở file “Cai Windi Windows.cmd”.
3. Chọn Chrome hoặc Cốc Cốc khi được hỏi, rồi chờ dòng “Windi Connect installed successfully.”

BƯỚC 2 — NẠP EXTENSION VÀO TRÌNH DUYỆT
1. Mở Chrome: chrome://extensions (hoặc Cốc Cốc: coccoc://extensions).
2. Bật “Developer mode”.
3. Chọn “Load unpacked”, rồi chọn thư mục “Windi Connect Extension” nằm ngay trong folder bạn vừa giải nén.

BƯỚC 3 — KIỂM TRA VÀ BẮT ĐẦU DÙNG
1. Mở một cửa sổ PowerShell mới (không chạy quyền Administrator).
2. Chạy: windi doctor
3. Nếu không có lỗi, Windi Connect đã sẵn sàng. Nếu có mã Workflow, chạy tiếp: windi login

Lưu ý: Cần Internet cho lần cài đầu. Bộ cài tự chuẩn bị Node, Python, FFmpeg, ffprobe, yt-dlp và renderer.`);
const output=path.join(root,'dist',`Windi-Video-Workflow-v${version}-universal.zip`);
await writeFile(output,await zip.generateAsync({type:'nodebuffer',platform:'UNIX',compression:'DEFLATE',compressionOptions:{level:9}}));
console.log(output);
