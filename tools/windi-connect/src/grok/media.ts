import { mkdir, readFile, writeFile, lstat, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import sharp from 'sharp';
import { inspectOriginal, publishStaged, type StagedOriginal } from '../assets.ts';
import { safeFile } from '../project.ts';
import type { Store, JobRow } from '../store.ts';
import { GrokAuth, type Transport } from './auth.ts';
import { referencePrompt, type GrokOptions } from './options.ts';
const exec = promisify(execFile);
export type GrokResult = {
    requestId?: string;
    url?: string;
    downloadPath?: string;
    submitted?: boolean;
    path?: string;
    duration?: number;
    [key: string]: unknown;
};
export function resultOf(job: JobRow): GrokResult { return JSON.parse(job.result_json || '{}'); }
export async function inspectVideo(file: string): Promise<StagedOriginal & {
    duration: number;
}> {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size < 64 || info.size > 512 * 1024 * 1024)
        throw new Error('GROK_INVALID_VIDEO_FILE');
    const { stdout } = await exec(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], { timeout: 30000, maxBuffer: 1024 * 1024 });
    const probe = JSON.parse(stdout), video = probe.streams?.find((s: any) => s.codec_type === 'video'), duration = Number(probe.format?.duration);
    if (!probe.format?.format_name?.split(',').includes('mp4') || !video?.width || !video?.height || video.width > 8192 || video.height > 8192 || !Number.isFinite(duration) || duration <= 0 || duration > 60)
        throw new Error('GROK_INVALID_VIDEO');
    return { path: file, mime: 'video/mp4', extension: '.mp4', width: video.width, height: video.height, duration, sha256: createHash('sha256').update(await readFile(file)).digest('hex') };
}
export function mediaUrl(value: string) { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || u.port || !(u.hostname === 'x.ai' || u.hostname.endsWith('.x.ai') || u.hostname === 'grok.com' || u.hostname.endsWith('.grok.com')))
    throw new Error('GROK_UNTRUSTED_MEDIA_URL'); return u.href; }
export async function downloadMedia(url: string, file: string, fetcher: Transport = fetch, limit = 512 * 1024 * 1024) {
    // Signed media URLs are fetched without OAuth headers, including redirects.
    let current = mediaUrl(url), response: Response | undefined;
    for (let hop = 0; hop < 5; hop++) {
        response = await fetcher(current, { redirect: 'manual', signal: AbortSignal.timeout(300000) });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get('location');
            await response.body?.cancel();
            if (!location)
                throw new Error('GROK_DOWNLOAD_REDIRECT');
            current = mediaUrl(new URL(location, current).href);
            continue;
        }
        break;
    }
    if (!response?.ok || !response.body)
        throw new Error('GROK_DOWNLOAD_FAILED');
    if (Number(response.headers.get('content-length')) > limit) {
        await response.body.cancel();
        throw new Error('GROK_MEDIA_TOO_LARGE');
    }
    const temp = `${file}.part`;
    const handle = await import('node:fs/promises').then(fs => fs.open(temp, 'w', 0o600));
    let bytes = 0;
    try {
        for await (const chunk of response.body as any) {
            bytes += chunk.length;
            if (bytes > limit)
                throw new Error('GROK_MEDIA_TOO_LARGE');
            await handle.writeFile(chunk);
        }
        await handle.close();
        await rename(temp, file);
    }
    catch (e) {
        await handle.close().catch(() => { });
        await rm(temp, { force: true });
        throw e;
    }
}
export async function imageData(file: string) { const image = await inspectOriginal(file); const data = await readFile(file); if (data.length > 20 * 1024 * 1024)
    throw new Error('GROK_REFERENCE_TOO_LARGE'); return { url: `data:${image.mime};base64,${data.toString('base64')}` }; }
export async function mediaPayload(job: JobRow, store: Store, options: GrokOptions) {
    const project = store.projectById(job.project_id);
    if (!project)
        throw new Error('PROJECT_NOT_REGISTERED');
    const files = [...(job.source_path ? [job.source_path] : []), ...store.references(job)];
    const images = await Promise.all(files.map(async (f) => imageData(await safeFile(project.root, f))));
    const prompt = referencePrompt(job.prompt, files.length);
    if (options.media === 'image')
        return { endpoint: images.length ? '/images/edits' : '/images/generations', payload: { model: options.model, prompt, n: 1, aspect_ratio: options.aspect, resolution: options.resolution, quality: options.quality, response_format: 'url', ...(images.length ? { images } : {}) } };
    return { endpoint: '/videos/generations', payload: { model: options.model, prompt, aspect_ratio: options.aspect, resolution: options.resolution, duration: options.duration, ...(job.source_path ? { image: images[0] } : images.length ? { reference_images: images } : {}) } };
}
export class GrokMedia {
    readonly auth: GrokAuth;
    readonly store: Store;
    readonly staging: string;
    readonly notify: () => void;
    constructor(auth: GrokAuth, store: Store, staging: string, notify: () => void) { this.auth = auth; this.store = store; this.staging = staging; this.notify = notify; }
    update(id: string, patch: Parameters<Store['updateJob']>[1]) { this.store.updateJob(id, patch); this.notify(); }
    async run(job: JobRow) {
        const options = JSON.parse(job.options_json || '{}') as GrokOptions;
        const current = () => this.store.job(job.id)!;
        const check = () => { if (current().status === 'cancelled')
            throw new Error('GROK_JOB_CANCELLED'); };
        let result = resultOf(job);
        const save = (patch: GrokResult) => { result = { ...result, ...patch }; this.update(job.id, { result_json: JSON.stringify(result) }); };
        const directory = path.join(this.staging, job.id);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const original = path.join(directory, options.media === 'video' ? 'download.mp4' : 'download.image');
        if (!result.downloadPath && !result.url && !result.requestId) {
            if (job.submitted_at || result.submitted)
                throw new Error('GROK_RESULT_UNKNOWN');
            this.update(job.id, { status: 'preparing' });
            const request = await mediaPayload(job, this.store, options);
            await this.auth.access();
            check();
            this.update(job.id, { status: 'submitted', submitted_at: new Date().toISOString() });
            save({ submitted: true });
            let response: any;
            try {
                response = await this.auth.request(request.endpoint, request.payload, job.id);
            }
            catch (e) {
                // An explicit HTTP rejection did not create a result. Network ambiguity did.
                if (e instanceof Error && /^GROK_(HTTP_4\d\d|LOGIN_REQUIRED|ENTITLEMENT_REQUIRED|QUOTA_EXCEEDED)$/.test(e.message)) {
                    this.update(job.id, { submitted_at: null });
                    save({ submitted: false });
                }
                throw e;
            }
            if (options.media === 'video') {
                const id = response.request_id || response.id;
                if (typeof id !== 'string' || !id)
                    throw new Error('GROK_RESULT_UNKNOWN');
                save({ requestId: id });
            }
            else {
                const item = response.data?.[0];
                if (item?.respect_moderation === false)
                    throw new Error('GROK_CONTENT_FILTERED');
                const encoded = item?.b64_json || item?.base64 || item?.b64;
                if (typeof encoded === 'string' && encoded) {
                    if (encoded.length > 140 * 1024 * 1024)
                        throw new Error('GROK_MEDIA_TOO_LARGE');
                    await writeFile(`${original}.part`, Buffer.from(encoded, 'base64'), { mode: 0o600 });
                    await rename(`${original}.part`,original);
                    save({ downloadPath: original });
                }
                else if (typeof item?.url === 'string')
                    save({ url: mediaUrl(item.url) });
                else
                    throw new Error('GROK_RESULT_UNKNOWN');
            }
        }
        check();
        if (options.media === 'video' && !result.url && !result.downloadPath) {
            this.update(job.id, { status: 'generating' });
            const deadline = Date.now() + 600000;
            while (Date.now() < deadline) {
                check();
                const polled = await this.auth.request(`/videos/${encodeURIComponent(result.requestId!)}`);
                if (polled.video?.respect_moderation === false)
                    throw new Error('GROK_CONTENT_FILTERED');
                if (['failed', 'error', 'expired', 'cancelled', 'canceled'].includes(polled.status))
                    throw new Error('GROK_VIDEO_FAILED');
                const url = polled.video?.url || polled.url;
                if (typeof url === 'string' && url) {
                    save({ url: mediaUrl(url) });
                    break;
                }
                this.update(job.id, { user_message: Number.isFinite(polled.progress) ? `Grok đang tạo video: ${polled.progress}%` : 'Grok đang tạo video…' });
                await delay(5000);
            }
            if (!result.url)
                throw new Error('GROK_POLL_TIMEOUT');
        }
        check();
        this.update(job.id, { status: 'downloading' });
        if (!result.downloadPath) {
            await downloadMedia(result.url!, original, this.auth.fetcher, options.media === 'image' ? 100 * 1024 * 1024 : 512 * 1024 * 1024);
            save({ downloadPath: original });
        }
        check();
        await publishGrokMedia(this.store,this.notify,current(),original);
    }
}

// Shared local-file publication; it has no transport or credential dependency.
export async function publishGrokMedia(store:Store,notify:()=>void,job:JobRow,original:string){
    const options=JSON.parse(job.options_json||'{}') as GrokOptions;
    let result=resultOf(job);
    const update=(id:string,patch:Parameters<Store['updateJob']>[1])=>{store.updateJob(id,patch);notify();};
    const save=(patch:GrokResult)=>{result={...result,...patch};update(job.id,{result_json:JSON.stringify(result)});};
    const check=()=>{if(store.job(job.id)?.status==='cancelled')throw new Error('GROK_JOB_CANCELLED');};
    check();
        const staged = options.media === 'video' ? await inspectVideo(original) : await inspectOriginal(original);
        if(options.media==='video'&&result.transport==='web'){
            if(options.aspect!=='auto'){
                const [w,h]=options.aspect.split(':').map(Number);
                if(!w||!h||Math.abs(staged.width/staged.height-w/h)/(w/h)>0.02)throw new Error('GROK_VIDEO_ASPECT_MISMATCH');
            }
            if('duration' in staged&&options.duration&&Math.abs(Number(staged.duration)-options.duration)>0.75)throw new Error('GROK_VIDEO_DURATION_MISMATCH');
        }
        const project = store.projectById(job.project_id)!;
        const existing = store.assetForJob(job.id);
        let asset: Pick<StagedOriginal, "path" | "mime" | "width" | "height" | "sha256">;
        if(existing) asset=existing;
        else if(result.path){
            const published=await safeFile(project.root,result.path);
            asset=options.media==='video'?await inspectVideo(published):await inspectOriginal(published);
            if(asset.sha256!==staged.sha256)throw new Error('GROK_PUBLISHED_ASSET_CHANGED');
        }else asset=await publishStaged(job, project.root, staged);
        save({path:asset.path});
        if (options.media === 'video')
            await exec(process.env.FFMPEG_PATH || 'ffmpeg', ['-v', 'error', '-y', '-i', asset.path, '-frames:v', '1', '-vf', 'scale=96:96:force_original_aspect_ratio=decrease', `${asset.path}.thumb.jpg`], { timeout: 30000 });
        else
            await sharp(asset.path).resize(96, 96, { fit: 'cover' }).jpeg({ quality: 72 }).toFile(`${asset.path}.thumb.jpg`);
        check();
        if (!existing)
            store.addAsset({ job, path: asset.path, mime: asset.mime, width: asset.width, height: asset.height, sha256: asset.sha256 });
        save({ path: asset.path, mime: asset.mime, width: asset.width, height: asset.height, sha256: asset.sha256, ...('duration' in staged ? { duration: staged.duration as number } : {}) });
        update(job.id, { status: 'complete', completed_at: new Date().toISOString(), error_code: null, user_message: null });
}
