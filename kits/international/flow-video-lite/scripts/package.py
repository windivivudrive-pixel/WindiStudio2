"""Create the customer ZIP from an explicit source allowlist, never a project dump."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FILES = ['package.json', 'package-lock.json', 'tsconfig.json', '.gitignore',
         'README.md', 'LICENSE.txt', 'THIRD-PARTY-NOTICES.md', 'QA.md',
         'Start Windows.cmd', 'Start macOS.command', 'src', 'scripts',
         'data/video.json', 'presets', 'public/assets/README.txt', 'skills']

def package():
    if (ROOT / 'data/video.json').read_bytes() != (ROOT / 'presets/ugc-ad.json').read_bytes():
        raise ValueError('Restore the factory sample before packaging; customer projects are not releases')
    version = json.loads((ROOT / 'package.json').read_text())['version']
    output = ROOT / 'dist' / f'windi-flow-video-lite-{version}.zip'
    output.parent.mkdir(exist_ok=True)
    entries = []
    for item in FILES:
        source = ROOT / item
        if source.is_symlink():
            raise ValueError(f'Symlink rejected: {source}')
        candidates = sorted(source.rglob('*')) if source.is_dir() else [source]
        for file in candidates:
            if file.is_symlink():
                raise ValueError(f'Symlink rejected: {file}')
            if file.is_dir() or '__pycache__' in file.parts or file.suffix == '.pyc':
                continue
            if not file.is_file():
                raise FileNotFoundError(file)
            relative = file.relative_to(ROOT)
            if file.name.startswith('.env') or file.suffix.lower() in {'.key', '.pem', '.mp4', '.mp3', '.wav', '.otf', '.ttf'}:
                raise ValueError(f'Unexpected distribution file: {relative}')
            entries.append((file, relative))
    manifest = {str(relative): hashlib.sha256(file.read_bytes()).hexdigest() for file, relative in entries}
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file, relative in entries:
            info = zipfile.ZipInfo(f'Windi Flow Video Lite/{relative.as_posix()}', date_time=(2026, 10, 10, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (0o100755 if file.suffix == '.command' else 0o100644) << 16
            archive.writestr(info, file.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        archive.writestr('Windi Flow Video Lite/CONTENTS-SHA256.json', json.dumps(manifest, indent=2) + '\n')
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise RuntimeError('ZIP CRC failure')
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.zip.sha256').write_text(f'{digest}  {output.name}\n')
    print(json.dumps({'path': str(output), 'files': len(entries), 'bytes': output.stat().st_size, 'sha256': digest}, indent=2))

if __name__ == '__main__':
    package()
