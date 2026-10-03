import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Store, JobRow } from '../store.ts';
import { loadedProject, readProjectText, safeFile, safeOutput } from '../project.ts';
import { inspectOriginal } from '../assets.ts';
import { grokWebOptions, referencePrompt } from './options.ts';
import { resultOf } from './media.ts';
export async function createGrokJob(store: Store, args: any) {
    const kind = args.kind ?? 'create';
    if (!['create', 'edit'].includes(kind))
        throw new Error('INVALID_JOB_KIND');
    const refs = args.references ?? [];
    if (!Array.isArray(refs))
        throw new Error('GROK_INVALID_REFERENCES');
    if (kind === 'edit' && !args.input)
        throw new Error('EDIT_INPUT_REQUIRED');
    const options = grokWebOptions({ ...args, kind }, refs.length, Boolean(args.input));
    const { project } = await loadedProject(store, args.project);
    const prompt = typeof args.prompt === 'string' ? args.prompt : (await readProjectText(project.root, args.promptFile)).content;
    if (!prompt.trim() || prompt.length > 24000)
        throw new Error('INVALID_TEXT');
    referencePrompt(prompt, refs.length + (args.input ? 1 : 0));
    const files = await Promise.all([...(args.input ? [args.input] : []), ...refs].map(async (f) => { if (typeof f !== 'string')
        throw new Error('GROK_INVALID_REFERENCE'); const safe = await safeFile(project.root, f); await inspectOriginal(safe); const bytes = await readFile(safe); if (bytes.length > 20 * 1024 * 1024)
        throw new Error('GROK_REFERENCE_TOO_LARGE'); return { path: safe, hash: createHash('sha256').update(bytes).digest('hex') }; }));
    const output = path.relative(project.root, await safeOutput(project.root, args.output));
    const fingerprint = createHash('sha256').update(JSON.stringify({ provider: 'grok', kind, prompt, files: files.map(f => f.hash), output, options })).digest('hex');
    return store.insertJob({ projectId: project.id, provider: 'grok', kind, requestKey: args.requestKey, fingerprint, prompt, sourcePath: args.input ? files[0].path : null, references: files.slice(args.input ? 1 : 0).map(f => f.path), outputPath: output, options });
}
export function resumeGrokJob(store: Store, job: JobRow, confirmNoResult = false) {
    if (['queued', 'preparing', 'submitted', 'generating', 'downloading', 'complete'].includes(job.status))
        throw new Error('JOB_NOT_RESUMABLE');
    const result = resultOf(job);
    if (job.submitted_at && !result.requestId && !result.url && !result.downloadPath && !result.webDownloadId) {
        if (!confirmNoResult) {
            if(result.transport==='web')return store.updateJob(job.id,{status:'queued',error_code:null,user_message:null,completed_at:null})!;
            throw new Error('GROK_RESULT_UNKNOWN');
        }
        // Explicit confirmation is required before a fresh submission after ambiguity.
        return store.updateJob(job.id, { status: 'queued', submitted_at: null, result_json: null, error_code: null, user_message: null, completed_at: null })!;
    }
    return store.updateJob(job.id, { status: 'queued', error_code: null, user_message: null, completed_at: null })!;
}
