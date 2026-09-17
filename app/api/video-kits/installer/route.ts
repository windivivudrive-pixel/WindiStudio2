import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {createProductToken} from '@/lib/products/license';
import {latestProductRelease} from '@/lib/products/releases';
import {failure,identity,VoiceError,writer} from '@/lib/voice/server';
export const runtime='nodejs';
const root='Windi Connect Installer.app/Contents/Resources/windi-connect';
export async function POST(request:Request){
 try{
  const {user}=await identity(request),db=writer();
  const {data:entitlement,error}=await db.from('product_entitlements').select('id,product_id').eq('user_id',user.id).eq('kind','video_workflow_v1').eq('status','active').maybeSingle();
  if(error)throw error;if(!entitlement)throw new VoiceError('Tài khoản chưa sở hữu Windi Workflow.',403);
  const {data:releases,error:releaseError}=await db.from('product_releases').select('*').eq('product_id',entitlement.product_id).eq('is_published',true);
  if(releaseError)throw releaseError;const release=latestProductRelease(releases??[]);
  if(!release || !/^\d+\.\d+\.\d+$/.test(release.version))throw new VoiceError('Bộ cài mới chưa sẵn sàng.',503);
  const {data:archive,error:downloadError}=await db.storage.from(release.storage_bucket).download(release.storage_path);
  if(downloadError)throw downloadError;
  if(!archive)throw new VoiceError('Chưa tải được bộ cài.',503);
  const source=Buffer.from(await archive.arrayBuffer());
  if(source.length!==Number(release.size_bytes)||createHash('sha256').update(source).digest('hex')!==release.sha256?.toLowerCase())throw new VoiceError('Checksum bộ cài không khớp. Vui lòng liên hệ hỗ trợ.',503);
  const zip=await JSZip.loadAsync(source,{checkCRC32:true});
  for(const name of ['package.json','scripts/install.mjs','scripts/bootstrap.ps1','scripts/bootstrap.sh']){
   if(!zip.file(root+'/'+name))throw new VoiceError('Bộ cài thiếu thành phần cần thiết.',503);
  }
  const manifest=zip.file('Windi Connect Extension/manifest.json');
  if(!manifest||JSON.parse(await manifest.async('string')).version!==release.version||JSON.parse(await zip.file(root+'/package.json')!.async('string')).version!==release.version)throw new VoiceError('Phiên bản bộ cài chưa đồng bộ.',503);
  const token=createProductToken();
  zip.file(root+'/windi-account.json',JSON.stringify({token:token.secret,apiUrl:new URL(request.url).origin}),{unixPermissions:0o100600});
  zip.file('windi-release.json',JSON.stringify({version:release.version,sourceArchiveSha256:release.sha256},null,2));
  zip.file('Cai Windi.command',[
   '#!/bin/sh','set -eu','BASE="$(cd "$(dirname "$0")" && pwd)"',
   'exec /bin/sh "$BASE/'+root+'/scripts/bootstrap.sh"',''
  ].join('\n'),{unixPermissions:0o100755});
  zip.file('Cai Windi Windows.cmd','@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Windi Connect Installer.app\\Contents\\Resources\\windi-connect\\scripts\\bootstrap.ps1"\r\nif errorlevel 1 pause\r\n');
  zip.file('HUONG-DAN.txt', '\uFEFFWINDI VIDEO WORKFLOW — BẮT ĐẦU\r\n\r\nBƯỚC 1: Giải nén toàn bộ ZIP vào thư mục giữ lâu dài. Windows: mở Cai Windi Windows.cmd; macOS: mở Cai Windi.command. Cần Internet cho lần cài đầu.\r\n\r\nBƯỚC 2: Mở chrome://extensions hoặc coccoc://extensions, bật Developer mode, chọn Load unpacked và chọn Windi Connect Extension ngay trong thư mục giải nén. Không di chuyển thư mục này sau khi nạp.\r\n\r\nBƯỚC 3: Đăng nhập Flow/ChatGPT trong trình duyệt đã kết nối. Mở lại Codex/Antigravity, mở thư mục dự án và gọi Windi Video Workflow.\r\n\r\nHướng dẫn từng bước, hình minh họa và mẫu câu:\r\nhttps://windistudio.app/video-kits/huong-dan\r\n\r\nKhông chia sẻ bộ cài cá nhân hoặc file kết nối tài khoản.');
  const bytes=await zip.generateAsync({type:'uint8array',platform:'UNIX',compression:'DEFLATE',compressionOptions:{level:6}});
  const {error:tokenError}=await db.from('automation_tokens').insert({user_id:user.id,purpose:'video_workflow',name:'Bộ cài cá nhân '+release.version,token_hash:token.hash,token_prefix:token.prefix,last_four:token.lastFour});
  if(tokenError)throw tokenError;
  return new Response(bytes,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Windi-Video-Workflow-v'+release.version+'-universal.zip"','Cache-Control':'private, no-store','X-Windi-Workflow-Version':release.version}});
 }catch(error){return failure(error);}
}
