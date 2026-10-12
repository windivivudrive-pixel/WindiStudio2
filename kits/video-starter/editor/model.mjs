import path from 'node:path';
import {readFile, writeFile, mkdir, rename, copyFile, realpath} from 'node:fs/promises';

import {validateDocument, validateAssetName} from './client-model.mjs';
export {validateDocument, moveBoundary, editCaption, validateAssetName} from './client-model.mjs';

export async function safeAsset(publicDir, name) {
  validateAssetName(name);
  const root = await realpath(publicDir);
  const file = await realpath(path.join(root, name));
  if (!file.startsWith(root + path.sep)) throw new Error('Media nằm ngoài thư mục public.');
  return file;
}

export async function saveDraft(file, doc, baseline) {
  const checked = validateDocument(doc, baseline);
  const current = await readFile(file, 'utf8').then(JSON.parse).catch(error => {if (error.code === 'ENOENT') return null; throw error;});
  if ((current?.revision ?? 0) !== checked.revision) {
    const error = new Error('Draft đã thay đổi ở cửa sổ khác. Tải lại để dùng bản mới nhất.'); error.status = 409; throw error;
  }
  await mkdir(path.dirname(file), {recursive: true});
  if (current) {
    const history = path.join(path.dirname(file), 'history'); await mkdir(history, {recursive: true});
    await copyFile(file, path.join(history, `revision-${current.revision}.json`));
  }
  checked.revision++;
  const temp = `${file}.tmp`; await writeFile(temp, JSON.stringify(checked, null, 2) + '\n', {mode: 0o600});
  await rename(temp, file);
  return checked;
}

export function captionsSrt(captions, endMs = Infinity) {
  const time = ms => {const v = Math.max(0, Math.round(ms)); return `${String(Math.floor(v / 3600000)).padStart(2, '0')}:${String(Math.floor(v / 60000) % 60).padStart(2, '0')}:${String(Math.floor(v / 1000) % 60).padStart(2, '0')},${String(v % 1000).padStart(3, '0')}`;};
  return captions.filter(c => c.startMs < endMs).map((c, i) => `${i + 1}\n${time(c.startMs)} --> ${time(Math.min(c.endMs, endMs))}\n${c.text}\n`).join('\n');
}
