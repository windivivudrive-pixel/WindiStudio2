$ErrorActionPreference = 'Stop'
$windiRoot = Join-Path $env:LOCALAPPDATA 'WindiConnect'
foreach ($provider in @('flow','chatgpt','grok')) {
  Write-Host "--- $provider ---"
  $proc = $null
  try {
    $manifestPath = Join-Path $windiRoot "native-hosts\com.windistudio.connect.$provider.json"
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    $origin = $manifest.allowed_origins[0]
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $env:ComSpec
    $info.Arguments = '/d /s /c ""' + $manifest.path + '" "' + $origin + '""'
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $info
    [void]$proc.Start()
    $errors = $proc.StandardError.ReadToEndAsync()
    # A read-only doctor request tests framing and the local daemon without pairing.
    $body = [Text.Encoding]::UTF8.GetBytes('{"version":2,"id":"native-diagnostic","op":"doctor","args":{}}')
    $head = [BitConverter]::GetBytes([uint32]$body.Length)
    $inputStream = $proc.StandardInput.BaseStream
    $inputStream.Write($head,0,4)
    $inputStream.Write($body,0,$body.Length)
    $inputStream.Flush()
    $outputStream = $proc.StandardOutput.BaseStream
    $header = New-Object byte[] 4
    $offset = 0
    while ($offset -lt 4) {
      $read = $outputStream.ReadAsync($header,$offset,4-$offset)
      if (-not $read.Wait(10000)) { throw 'Native host response timed out' }
      if ($read.Result -eq 0) { throw 'Native host closed stdout before sending a message' }
      $offset += $read.Result
    }
    $length = [BitConverter]::ToUInt32($header,0)
    if ($length -gt 900000) { throw "Invalid native frame length: $length" }
    $payload = New-Object byte[] $length
    $offset = 0
    while ($offset -lt $length) {
      $read = $outputStream.ReadAsync($payload,$offset,$length-$offset)
      if (-not $read.Wait(10000)) { throw 'Native payload timed out' }
      if ($read.Result -eq 0) { throw 'Incomplete native payload' }
      $offset += $read.Result
    }
    $reply = [Text.Encoding]::UTF8.GetString($payload) | ConvertFrom-Json
    if ($reply.error) { throw ($reply.error | ConvertTo-Json -Compress) }
    if ($reply.id -ne 'native-diagnostic' -or $reply.result.version -ne 2) { throw 'Unexpected native response' }
    Write-Host 'PASS: launcher, native framing and daemon communication' -ForegroundColor Green
  } catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
  } finally {
    if ($proc) {
      try { $proc.StandardInput.Close() } catch {}
      if (-not $proc.WaitForExit(3000)) { $proc.Kill() }
      if ($errors -and $errors.Wait(3000) -and $errors.Result) { Write-Host $errors.Result }
      $proc.Dispose()
    }
  }
}
Read-Host 'Press Enter to close'
