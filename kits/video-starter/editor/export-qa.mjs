import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, writeFile, stat} from 'node:fs/promises';
import {getVideoMetadata} from '@remotion/renderer';

export async function verifyExport(outputDir, snapshot) {
  const metadata = await getVideoMetadata(path.join(outputDir, 'final.mp4'));
  const [video, cover, srt] = await Promise.all(['final.mp4', 'cover.png', 'captions.srt'].map(name => stat(path.join(outputDir, name))));
  const checks = {dimensions: metadata.width === 1080 && metadata.height === 1920,
    fps: Math.abs(metadata.fps - snapshot.fps) < 0.01,
    duration: Math.abs(metadata.durationInSeconds - snapshot.totalFrames / snapshot.fps) <= 2 / snapshot.fps,
    audio: Boolean(metadata.audioCodec), video: metadata.codec === 'h264' && video.size > 1000,
    cover: cover.size > 100, captions: srt.size > 0};
  const qa = {schemaVersion: 1, technicalPassed: Object.values(checks).every(Boolean), visualAudioReview: 'pending',
    checkedAt: new Date().toISOString(), revision: snapshot.revision, checks, metadata, videoBytes: video.size};
  await writeFile(path.join(outputDir, 'qa.json'), JSON.stringify(qa, null, 2) + '\n');
  return qa;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputDir = path.resolve(process.argv[2]);
  const snapshot = JSON.parse(await readFile(path.join(outputDir, 'edit.json'), 'utf8'));
  const qa = await verifyExport(outputDir, snapshot);
  console.log(JSON.stringify(qa, null, 2));
  if (!qa.technicalPassed) process.exitCode = 1;
}
