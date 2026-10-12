"""Whitelist source files, never package auth, local configuration, models or media."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path
root = Path(sys.argv[1])
version = json.loads((root/'package.json').read_text())['version']
dist = root/'dist'
dist.mkdir(exist_ok=True)
output = dist/f'windi-dubbing-kit-{version}.zip'
allowed = {'SKILL.md','README.md','QA.md','THIRD_PARTY.md','package.json','.gitignore','Start Windi Dubbing.command','Start Windi Dubbing.bat'}
files = [p for p in root.iterdir() if p.is_file() and (p.name in allowed or p.suffix in ('.mjs','.js','.css','.html'))]
for directory in ('workers','tests'):
    files += [p for p in (root/directory).rglob('*') if p.is_file() and p.suffix in ('.py','.mjs') and '__pycache__' not in p.parts]
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path,Path('windi-dubbing-kit')/path.relative_to(root))
digest=hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.zip.sha256').write_text(f'{digest}  {output.name}\n')
print(json.dumps({'zip':str(output),'sha256':digest,'files':len(files),'bytes':output.stat().st_size},ensure_ascii=False))
