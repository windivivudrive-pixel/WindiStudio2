import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function command(name, args) {
  if (process.platform === 'win32' && name === 'codex') {
    const script = join(process.env.APPDATA || '', 'npm/node_modules/@openai/codex/bin/codex.js');
    if (existsSync(script)) return [process.execPath, [script, ...args]];
  }
  return [name, args];
}

export function run(name, args, { cwd, input, timeout = 30 * 60_000, signal, onLine, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Đã hủy tác vụ.'));
    const [exe, argv] = command(name, args);
    const child = spawn(exe, argv, { cwd, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', buffered = '', settled = false;
    const stop = () => {
      if (!child.pid) return;
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    };
    const timer = setTimeout(() => { stop(); finish(new Error('Tác vụ quá thời gian. Có thể thử lại; kết quả đã lưu được giữ lại.')); }, timeout);
    const abort = () => { stop(); finish(new Error('Đã hủy tác vụ.')); };
    signal?.addEventListener('abort', abort, { once: true });
    const finish = (error) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve({ stdout, stderr });
    };
    child.on('error', error => finish(new Error(`Không chạy được ${name}: ${error.message}`)));
    child.stdout.on('data', chunk => {
      stdout += chunk.toString(); if (stdout.length > 8_000_000) { stop(); finish(new Error('Kết quả tác vụ vượt giới hạn.')); return; }
      buffered += chunk; const lines = buffered.split('\n'); buffered = lines.pop(); lines.forEach(line => onLine?.(line));
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-16_000); });
    child.on('close', code => { if (buffered) onLine?.(buffered); finish(code === 0 ? null : new Error(signal?.aborted ? 'Đã hủy tác vụ.' : `${name} lỗi (${code}): ${stderr.slice(-1800) || stdout.slice(-1800)}`)); });
    child.stdin.on('error', () => {}); child.stdin.end(input || '');
  });
}
