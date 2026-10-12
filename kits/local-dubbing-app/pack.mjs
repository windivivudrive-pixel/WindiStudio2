import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './process.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const result=await run(process.platform==='win32'?'python':'python3',[join(root,'workers/pack.py'),root],{timeout:60_000});console.log(result.stdout.trim());
