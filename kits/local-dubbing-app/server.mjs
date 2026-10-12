import { execFileSync } from "node:child_process";
import { existsSync, statfsSync, statSync, createReadStream } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { pipeline as streamPipeline } from 'node:stream/promises';
import { dataRoot, listProjects, createProject, getProject, updateProject, projectDir, importVideo, startJob, cancelJob, importTranslation, assertIdle, shutdownJobs } from './pipeline.mjs';
import { resolveRuntime, inspectRuntime } from "./runtime.mjs";
import { publicVoiceSettings, saveVoiceSettings } from './voice-api.mjs';

if(Number(process.versions.node.split('.')[0])<20)throw new Error('Windi Dubbing cần Node.js 20 trở lên.');
const directory = dirname(fileURLToPath(import.meta.url));
const workspace = directory;
const port = Number(process.env.LOCAL_DUBBING_PORT || 8787);
const settingsFile = join(dataRoot, 'settings.json');
let runtimeSettings = { whisper: '', vieneu: '' };
try { const saved = JSON.parse(await readFile(settingsFile, 'utf8')); runtimeSettings = { whisper: saved.whisper || '', vieneu: saved.vieneu || '' }; } catch { /* use default Python */ }
const mime = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };

function commandVersion(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", timeout: 1200, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 8192 }).trim().split("\n")[0].slice(0, 100);
  } catch {
    return null;
  }
}

function environment() {
  const runtimes = Object.fromEntries(Object.entries(runtimeSettings).map(([key, path]) => {
    try { return [key, inspectRuntime(resolveRuntime(path))]; }
    catch (error) { return [key, { source: path, python: null, error: error.message }]; }
  }));
  let freeBytes = null;
  try { freeBytes = statfsSync(workspace).bavail * statfsSync(workspace).bsize; } catch { /* show unknown */ }

  return {
    machine: { os: `${os.type()} ${os.release()}`, architecture: os.arch(), ramBytes: os.totalmem(), freeBytes },
    tools: {
      python: runtimes.whisper.python || runtimes.vieneu.python,
      ffmpeg: commandVersion("ffmpeg", ["-version"]),
      ffprobe: commandVersion("ffprobe", ["-version"]),
      ytDlp: commandVersion("yt-dlp", ["--version"]) || commandVersion(runtimes.whisper.executable || (process.platform==='win32'?'python':'python3'), ['-m','yt_dlp','--version']),
      whisper: runtimes.whisper.whisper ? "Đã tìm thấy bộ nhận diện lời thoại" : null,
      vieneu: runtimes.vieneu.vieneu ? "Đã tìm thấy bộ tạo giọng Việt" : null,
      remotion: existsSync(join(workspace, "node_modules/.bin/remotion")) ? "Có trong workspace" : null,
      codex: commandVersion("codex", ["--version"]),
      antigravity: commandVersion("agy", ["--version"]),
    },
    checkedAt: new Date().toISOString(),
    runtimes,
    runtimeSettings,
    previewOnly: false,
    version: "0.1.0-beta.5",
  };
}

async function jsonBody(request) {
  let body=''; for await(const chunk of request){ body+=chunk; if(body.length>4_000_000)throw new Error('Nội dung quá lớn.'); } return JSON.parse(body || '{}');
}
function json(response, value, status=200){response.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});response.end(JSON.stringify(value));}
const server = createServer(async (request, response) => {
 try {
  const origin=request.headers.origin;
  if(request.headers.host!==`127.0.0.1:${port}` || (origin && origin!==`http://127.0.0.1:${port}`)){response.writeHead(403);response.end();return;}
  const url=new URL(request.url,'http://127.0.0.1');
  if(url.pathname==='/api/voice-config' && request.method==='GET')return json(response,await publicVoiceSettings(dataRoot));
  if(url.pathname==='/api/voice-config' && request.method==='POST'){
    if(listProjects().some(p=>getProject(p.id).job?.status==='running'))throw new Error('Đợi tác vụ hoàn tất hoặc hủy trước khi đổi API.');
    return json(response,await saveVoiceSettings(dataRoot,await jsonBody(request)));
  }
  if(url.pathname==='/api/projects' && request.method==='GET')return json(response,listProjects());
  if(url.pathname==='/api/projects' && request.method==='POST')return json(response,createProject((await jsonBody(request)).name));
  const match=url.pathname.match(/^\/api\/projects\/([a-f0-9-]{36})(?:\/(.*))?$/);
  if(match){
    const [,id,action]=match;
    if(!action && request.method==='GET')return json(response,getProject(id));
    if(!action && request.method==='PATCH')return json(response,updateProject(id,await jsonBody(request)));
    if(action==='import-video' && request.method==='POST'){const body=await jsonBody(request);return json(response,await importVideo(id,resolve(body.path)));}
    if(action==='upload' && request.method==='POST'){
      assertIdle(id);getProject(id);
      const size=Number(request.headers['content-length']);if(!Number.isFinite(size)||size<=0||size>4*1024**3)throw new Error('File cần nhỏ hơn 4GB.');
      const free=statfsSync(dataRoot);if(size>free.bavail*free.bsize*.7)throw new Error('Không đủ dung lượng để lưu và xử lý video.');
      const name=decodeURIComponent(request.headers['x-file-name']||'video.mp4');const ext=extname(name).toLowerCase();if(!['.mp4','.mov','.mkv','.webm','.avi','.m4v'].includes(ext))throw new Error('Định dạng video chưa được hỗ trợ.');
      const temp=join(projectDir(id),'upload'+ext);const {createWriteStream}=await import('node:fs');await streamPipeline(request,createWriteStream(temp));return json(response,await importVideo(id,temp));
    }
    if(action==='job' && request.method==='POST'){const body=await jsonBody(request);if(!['download','transcribe','translate','rewrite','voices','sample','tts','render'].includes(body.step))throw new Error('Bước không hợp lệ.');return json(response,startJob(id,body.step,runtimeSettings,body));}
    if(action==='cancel' && request.method==='POST')return json(response,cancelJob(id));
    if(action==='translation' && request.method==='POST')return json(response,importTranslation(id,await jsonBody(request)));
    if(action==='request' && request.method==='GET'){const p=getProject(id);if(!p.pendingTranslation)throw new Error('Chưa có yêu cầu dịch.');return json(response,JSON.parse(await readFile(join(projectDir(id),'translation-request.json'),'utf8')));}
    if(action?.startsWith('file/') && request.method==='GET'){
      const p=getProject(id), relative=decodeURIComponent(action.slice(5));
      const allowed=[p.video?.file,p.artifacts.sample,...Object.values(p.artifacts.samples||{}),...Object.values(p.artifacts.render||{}),'translation-request.json','transcript.json','timing.json'];
      if(!allowed.includes(relative)||typeof relative!=='string'||relative.includes('..'))throw new Error('File chưa sẵn sàng.');
      const file=join(projectDir(id),relative), size=statSync(file).size;
      const types={'.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.wav':'audio/wav','.srt':'text/plain; charset=utf-8','.json':'application/json'};
      const headers={'content-type':types[extname(file)]||'application/octet-stream','accept-ranges':'bytes','cache-control':'no-store'};
      if(url.searchParams.has('download'))headers['content-disposition']=`attachment; filename="${relative.split('/').pop()}"`;
      const range=request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):size-1,size-1);if(start>end||start>=size){response.writeHead(416,{'content-range':`bytes */${size}`});response.end();return;}response.writeHead(206,{...headers,'content-range':`bytes ${start}-${end}/${size}`,'content-length':end-start+1});createReadStream(file,{start,end}).pipe(response);}
      else{response.writeHead(200,{...headers,'content-length':size});createReadStream(file).pipe(response);}return;
    }
    throw new Error('Không tìm thấy thao tác.');
  }
  if (request.url === '/api/runtime-config' && request.method === 'POST') {
    const origin = request.headers.origin;
    if ((origin && origin !== `http://127.0.0.1:${port}`) || request.headers['content-type'] !== 'application/json' || request.headers.host !== `127.0.0.1:${port}`) {
      response.writeHead(403); response.end(); return;
    }
    try {
      let body = '';
      for await (const chunk of request) { body += chunk; if (body.length > 8192) throw new Error('Đường dẫn quá dài.'); }
      const input = JSON.parse(body);
      const next = {};
      for (const key of ['whisper', 'vieneu']) {
        if (typeof input[key] !== 'string') throw new Error('Đường dẫn không hợp lệ.');
        const runtime = resolveRuntime(input[key]);
        const status = inspectRuntime(runtime);
        if (input[key].trim() && (status.error || !status[key])) throw new Error(`${key === 'whisper' ? 'Windi Decode' : 'Windi TTS'}: ${status.error || 'Chưa tìm thấy engine trong môi trường này.'}`);
        next[key] = runtime.source;
      }
      await mkdir(dirname(settingsFile), { recursive: true });
      await writeFile(settingsFile, JSON.stringify(next, null, 2));
      runtimeSettings = next;
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify(environment()));
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json' }); response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  if (request.url === "/api/system-check") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify(environment()));
    return;
  }

  const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const file = resolve(directory, relative);
  if (!['index.html', 'styles.css', 'app.js'].includes(relative) || !file.startsWith(`${directory}/`) || !existsSync(file)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Không tìm thấy trang.");
    return;
  }

  response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(await readFile(file));
 }catch(error){ if(!response.headersSent)json(response,{error:error.message},400);else response.end(); }
});

server.on("error", (error) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${port} đang được dùng. Thử LOCAL_DUBBING_PORT=8788 node kits/local-dubbing-app/server.mjs` : error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => console.log(`Windi Dubbing beta: http://127.0.0.1:${port}`));

for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>{shutdownJobs();server.close();setTimeout(()=>process.exit(0),200).unref();});
