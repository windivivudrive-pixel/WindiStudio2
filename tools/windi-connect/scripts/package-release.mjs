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
  zip.file('HUONG-DAN.txt', '\uFEFFWINDI VIDEO WORKFLOW — BẮT ĐẦU\r\n\r\nBƯỚC 1: Giải nén toàn bộ ZIP vào thư mục giữ lâu dài. Windows: mở Cai Windi Windows.cmd; macOS: mở Windi Connect Installer.app. Cần Internet cho lần cài đầu.\r\n\r\nBƯỚC 2: Mở chrome://extensions hoặc coccoc://extensions, bật Developer mode, chọn Load unpacked và chọn Windi Connect Extension ngay trong thư mục giải nén. Không di chuyển thư mục này sau khi nạp.\r\n\r\nBƯỚC 3: Đăng nhập Flow/ChatGPT trong trình duyệt đã kết nối. Mở lại Codex/Antigravity, mở thư mục dự án và gọi Windi Video Workflow.\r\n\r\nHướng dẫn từng bước, hình minh họa và mẫu câu:\r\nhttps://windistudio.app/video-kits/huong-dan\r\n\r\nKhông chia sẻ bộ cài cá nhân hoặc file kết nối tài khoản.');
const output=path.join(root,'dist',`Windi-Video-Workflow-v${version}-universal.zip`);
await writeFile(output,await zip.generateAsync({type:'nodebuffer',platform:'UNIX',compression:'DEFLATE',compressionOptions:{level:9}}));
console.log(output);
