import JSZip from 'jszip';
import {createProductToken} from '@/lib/products/license';
import {latestProductRelease} from '@/lib/products/releases';
import {failure,identity,VoiceError,writer} from '@/lib/voice/server';
export const runtime='nodejs';
const quote=(value:string)=>"'"+value.replaceAll("'","'\\''")+"'";
const psQuote=(value:string)=>"'"+value.replaceAll("'","''")+"'";
export async function POST(request:Request){
 try{
  const {user}=await identity(request),db=writer();
  const {data:entitlement,error}=await db.from('product_entitlements').select('id,product_id').eq('user_id',user.id).eq('kind','video_workflow_v1').eq('status','active').maybeSingle();
  if(error)throw error;if(!entitlement)throw new VoiceError('Tài khoản chưa sở hữu Windi Workflow.',403);
  const {data:releases,error:releaseError}=await db.from('product_releases').select('*').eq('product_id',entitlement.product_id).eq('is_published',true);
  if(releaseError)throw releaseError;const release=latestProductRelease(releases??[]);if(!release)throw new VoiceError('Bộ cài mới chưa được phát hành.',503);
  if(!/^0\.5\.(?:[6-9]|[1-9]\d+)(?:-|$)/.test(release.version))throw new VoiceError('Bộ cài tự kết nối Voice đang được chuẩn bị.',503);
  if(!/^[a-f0-9]{64}$/i.test(release.sha256))throw new VoiceError('Bộ cài chưa có checksum hợp lệ.',503);
  const {data:signed,error:signError}=await db.storage.from(release.storage_bucket).createSignedUrl(release.storage_path,86400);
  if(signError)throw signError;
  const token=createProductToken();
  const {error:tokenError}=await db.from('automation_tokens').insert({user_id:user.id,purpose:'video_workflow',name:'Bộ cài cá nhân',token_hash:token.hash,token_prefix:token.prefix,last_four:token.lastFour});
  if(tokenError)throw tokenError;
  const zip=new JSZip();
  zip.file('windi-account.json',JSON.stringify({token:token.secret,apiUrl:new URL(request.url).origin}),{unixPermissions:0o100600});
  zip.file('windi-release.json',`${JSON.stringify({product:'windi-video-workflow-v1',version:release.version,sha256:release.sha256,storagePath:release.storage_path},null,2)}\n`,{unixPermissions:0o100600});
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
  if(Number(release.version.split('.')[2]?.split('-')[0])>=9){
    zip.file('Cai Windi Windows.cmd','@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cai Windi Windows.ps1"\r\n');
    zip.file('Cai Windi Windows.ps1',`$ErrorActionPreference='Stop'
try {
  $temp=Join-Path ([IO.Path]::GetTempPath()) ('windi-'+[guid]::NewGuid())
  New-Item -ItemType Directory -Path $temp | Out-Null
  $archive=Join-Path $temp 'windi.zip'
  Invoke-WebRequest -UseBasicParsing -Uri ${psQuote(signed.signedUrl)} -OutFile $archive
  if((Get-FileHash -Algorithm SHA256 $archive).Hash.ToLower() -ne ${psQuote(release.sha256.toLowerCase())}){throw 'Checksum mismatch'}
  Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $temp 'app')
  $root=Join-Path $temp 'app/Windi Connect Installer.app/Contents/Resources/windi-connect'
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'windi-account.json') -Destination (Join-Path $root 'windi-account.json')
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'scripts/bootstrap.ps1')
  if($LASTEXITCODE -ne 0){throw 'Installation failed'}
} catch { Write-Host $_.Exception.Message; Read-Host 'Press Enter'; exit 1 }
finally { if($temp -and (Test-Path $temp)){Remove-Item -LiteralPath $temp -Recurse -Force} }
`);
  }
  zip.file('HUONG-DAN.txt',`Giải nén toàn bộ ZIP. Bản workflow: ${release.version}. Có thể mở windi-release.json để đối chiếu checksum. macOS: mở Cai Windi.command. Windows x64 (bản 0.5.9 trở lên): mở Cai Windi Windows.cmd. Cần Internet để tự cài môi trường lần đầu. Bộ cài tự kết nối Voice của tài khoản đã mua. Không chia sẻ bộ cài cá nhân. Link tải bên trong có hạn 24 giờ; tải bộ cài mới từ website nếu hết hạn. Bật extension Windi một lần theo hướng dẫn. Sau đó nói với Codex: Dùng Windi làm video này.`);
  const bytes=await zip.generateAsync({type:'uint8array',platform:'UNIX'});
  return new Response(bytes,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Windi-Cai-Dat-Ca-Nhan.zip"','Cache-Control':'private, no-store','X-Windi-Workflow-Version':release.version}});
 }catch(error){return failure(error);}
}
