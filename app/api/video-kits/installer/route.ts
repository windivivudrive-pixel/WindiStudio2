import JSZip from 'jszip';
import {createProductToken} from '@/lib/products/license';
import {failure,identity,VoiceError,writer} from '@/lib/voice/server';
export const runtime='nodejs';
const quote=(value:string)=>"'"+value.replaceAll("'","'\\''")+"'";
export async function POST(request:Request){
 try{
  const {user}=await identity(request),db=writer();
  const {data:entitlement,error}=await db.from('product_entitlements').select('id,product_id').eq('user_id',user.id).eq('kind','video_workflow_v1').eq('status','active').maybeSingle();
  if(error)throw error;if(!entitlement)throw new VoiceError('Tài khoản chưa sở hữu Windi Workflow.',403);
  const {data:release,error:releaseError}=await db.from('product_releases').select('*').eq('product_id',entitlement.product_id).eq('is_published',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(releaseError)throw releaseError;if(!release)throw new VoiceError('Bộ cài mới chưa được phát hành.',503);
  if(!/^0\.5\.(?:[6-9]|[1-9]\d+)(?:-|$)/.test(release.version))throw new VoiceError('Bộ cài tự kết nối Voice đang được chuẩn bị.',503);
  if(!/^[a-f0-9]{64}$/i.test(release.sha256))throw new VoiceError('Bộ cài chưa có checksum hợp lệ.',503);
  const {data:signed,error:signError}=await db.storage.from(release.storage_bucket).createSignedUrl(release.storage_path,86400);
  if(signError)throw signError;
  const token=createProductToken();
  const {error:tokenError}=await db.from('automation_tokens').insert({user_id:user.id,purpose:'video_workflow',name:'Bộ cài cá nhân',token_hash:token.hash,token_prefix:token.prefix,last_four:token.lastFour});
  if(tokenError)throw tokenError;
  const zip=new JSZip();
  zip.file('windi-account.json',JSON.stringify({token:token.secret,apiUrl:new URL(request.url).origin}),{unixPermissions:0o100600});
  zip.file('Cai Windi.command',`#!/bin/bash
set -euo pipefail
umask 077
BASE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf 'Đang tải Windi Workflow…\\n'
curl --fail --location --silent --show-error ${quote(signed.signedUrl)} --output "$TMP/windi.zip"
printf '%s  %s\\n' ${quote(release.sha256)} "$TMP/windi.zip" | shasum -a 256 -c -
ditto -x -k "$TMP/windi.zip" "$TMP/app"
ROOT="$TMP/app/Windi Connect Installer.app/Contents/Resources/windi-connect"
cp "$BASE/windi-account.json" "$ROOT/windi-account.json"
/bin/sh "$ROOT/Install Windi Connect.command"
`,{unixPermissions:0o100700});
  zip.file('HUONG-DAN.txt','Giải nén toàn bộ ZIP, mở Cai Windi.command. Bộ cài tự kết nối Voice của tài khoản đã mua. Không chia sẻ bộ cài cá nhân. Link tải bên trong có hạn 24 giờ; tải bộ cài mới từ website nếu hết hạn. Bật extension Windi một lần theo hướng dẫn. Sau đó nói với Codex: Dùng Windi làm video này.');
  const bytes=await zip.generateAsync({type:'uint8array',platform:'UNIX'});
  return new Response(bytes,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Windi-Cai-Dat-Ca-Nhan.zip"','Cache-Control':'private, no-store'}});
 }catch(error){return failure(error);}
}
