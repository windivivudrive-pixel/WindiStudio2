import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import os from 'node:os';

export function resolveRuntime(input = '', platform = process.platform) {
  const value = input.trim();
  if (!value) return { python: platform === 'win32' ? 'python' : 'python3', cwd: undefined, source: '' };
  const expanded = value.startsWith('~/') ? join(os.homedir(), value.slice(2)) : value;
  if (!isAbsolute(expanded)) throw new Error('Hãy nhập đường dẫn đầy đủ tới project, môi trường hoặc Python.');
  const source = resolve(expanded);
  if (!existsSync(source)) throw new Error('Không tìm thấy đường dẫn này trên máy.');
  if (statSync(source).isFile()) {
    if (!/^python(?:\d+(?:\.\d+)*)?(?:\.exe)?$/i.test(basename(source))) throw new Error('Hãy chọn file Python của môi trường.');
    return { python: source, cwd: undefined, source };
  }
  const binary = platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python'];
  const candidates = [join(source, ...binary), join(source, '.venv', ...binary), join(source, 'venv', ...binary), join(source, 'env', ...binary)];
  const python = candidates.find(file => existsSync(file) && statSync(file).isFile());
  if (!python) throw new Error('Chưa thấy Python trong project. Chọn trực tiếp môi trường Conda/venv hoặc file Python.');
  return { python, cwd: source, source };
}

export function inspectRuntime(runtime) {
  try {
    const script = `import sys,json,platform,importlib.util as u,importlib.metadata as m
v={}
for name in ['vieneu','onnxruntime','openai-whisper']:
 try:v[name]=m.version(name)
 except m.PackageNotFoundError:v[name]=None
print(json.dumps({'python':sys.version.split()[0],'executable':sys.executable,'architecture':platform.machine(),'versions':v,'whisper':bool(u.find_spec('whisper')),'vieneu':bool(u.find_spec('vieneu'))}))`;
    const output = execFileSync(runtime.python, ['-c', script], { cwd: runtime.cwd, encoding: 'utf8', timeout: 4000, maxBuffer: 16384, stdio: ['ignore', 'pipe', 'ignore'] });
    const details = JSON.parse(output.trim().split('\n').at(-1));
    return { ...runtime, ...details, error: null };
  } catch {
    return { ...runtime, python: null, whisper: false, vieneu: false, error: 'Không chạy được Python đã chọn. Kiểm tra môi trường hoặc quyền thực thi.' };
  }
}
