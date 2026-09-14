$ErrorActionPreference = 'Stop'
try {
  if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'Windows x64 is required.' }
  $root = Split-Path $PSScriptRoot -Parent
  $choice = Read-Host 'Browser: [1] Chrome [2] Coc Coc'
  if ($choice -notin @('1','2')) { throw 'Choose 1 or 2.' }
  $browser = if ($choice -eq '1') { 'chrome' } else { 'coccoc' }
  $temp = Join-Path ([IO.Path]::GetTempPath()) ('windi-install-' + [guid]::NewGuid())
  New-Item -ItemType Directory -Path $temp | Out-Null
  $runtime = Join-Path $env:LOCALAPPDATA 'WindiConnect\releases\0.5.9\runtime'
  $ready = $false
  if (Test-Path (Join-Path $runtime 'node.exe')) {
    $version = & (Join-Path $runtime 'node.exe') --version
    $ready = $LASTEXITCODE -eq 0 -and $version -eq 'v24.11.1'
  }
  if (-not $ready) {
    Write-Host 'Downloading the Windi environment...'
    $archive = Join-Path $temp 'node.zip'
    Invoke-WebRequest -UseBasicParsing -Uri 'https://nodejs.org/dist/v24.11.1/node-v24.11.1-win-x64.zip' -OutFile $archive
    if ((Get-FileHash -Algorithm SHA256 $archive).Hash.ToLower() -ne '5355ae6d7c49eddcfde7d34ac3486820600a831bf81dc3bdca5c8db6a9bb0e76') { throw 'Node checksum mismatch.' }
    Expand-Archive -LiteralPath $archive -DestinationPath $temp
    $runtime = Join-Path $temp 'node-v24.11.1-win-x64'
  }
  & (Join-Path $runtime 'node.exe') --no-warnings (Join-Path $root 'scripts\install.mjs') "--runtime-root=$runtime" "--browser=$browser"
  if ($LASTEXITCODE -ne 0) { throw 'Installation failed. Re-run this installer to retry.' }
  Write-Host 'Windi installed. Open a new terminal and run: windi doctor'
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
} finally {
  if ($temp -and (Test-Path $temp)) { Remove-Item -LiteralPath $temp -Recurse -Force }
}
