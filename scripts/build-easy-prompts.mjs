import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEasyPrompt, EASY_PROMPT_COMPOSER_VERSION, validateEasyPrompt } from './easy-prompt-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = resolve(root, 'data/catalog/creator-100.json');
const outputPath = resolve(root, 'data/catalog/easy-prompts.json');
const reportPath = resolve(root, 'data/catalog/easy-prompt-report.json');

const catalog = JSON.parse(await readFile(inputPath, 'utf8'));
if (!Array.isArray(catalog.resources) || catalog.resources.length !== 100) throw new Error('Expected exactly 100 Creator resources');
const prompts = catalog.resources.map(buildEasyPrompt);
const failures = prompts.flatMap(prompt => validateEasyPrompt(prompt).map(reason => ({ external_identity: prompt.external_identity, reason })));
if (new Set(prompts.map(prompt => prompt.external_identity)).size !== 100) throw new Error('Duplicate prompt identity');
if (failures.length) throw new Error(`Easy Prompt validation failed: ${JSON.stringify(failures.slice(0, 5))}`);
const generatedAt = new Date().toISOString();
const payload = { edition: catalog.edition, catalogHash: catalog.contentHash, composerVersion: EASY_PROMPT_COMPOSER_VERSION, generatedAt, prompts };
const report = { generatedAt, edition: catalog.edition, composerVersion: EASY_PROMPT_COMPOSER_VERSION, expected: 100, generated: prompts.length, valid: prompts.length - new Set(failures.map(x => x.external_identity)).size, failed: failures, changedSourceReviewRequired: [] };
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ generated: prompts.length, report: reportPath }, null, 2));
