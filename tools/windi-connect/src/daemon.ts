import {flowImageOptions,flowVariantCount,assertFlowImageAspect} from './flow-options.ts';
import {GrokWebMedia} from './grok/web.ts';
import {loadProfile,profileWriter} from './profile-file.ts';
import {resultOf} from './grok/media.ts';
import {createGrokJob,resumeGrokJob} from './grok/jobs.ts';
import {cleanupDownloadedOriginal} from './assets.ts';
import net from "node:net";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdir,
  chmod,
  lstat,
  unlink,
  rename,
  readFile,
  writeFile,
  stat,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createHash, randomUUID } from "node:crypto";
import {
  home,
  runtime,
  socketPath,
  databasePath,
  stagingRoot,
  VERSION,
  validProvider,
  allowedUrl,
  providerUrl,
  parseLines,
  type Provider,
  type JobKind,
  userActionErrors,
} from "./protocol.ts";
import { openStore, type JobRow } from "./store.ts";
import {
  loadedProject,
  registerProject,
  readProjectText,
  safeFile,
  safeOutput,
  uniqueOutput,
} from "./project.ts";
import { stageOriginal, publishStaged, inspectOriginal } from "./assets.ts";
import {
  ProviderActionRequired,
  runProviderJob,
  type BrowserBridge,
  type Download,
} from "./providers.ts";
import {
  advanceWorkflow,
  approveWorkflow,
  buildImageManifest,
  chooseBuiltinLayout,
  loadWorkflow,
  putWorkflowArtifact,
  registerVoiceArtifacts,
  serializeWorkflow,
  startWorkflow,
} from "./workflow.ts";

await mkdir(home, { recursive: true, mode: 0o700 });
await mkdir(runtime, { recursive: true, mode: 0o700 });
await mkdir(stagingRoot, { recursive: true, mode: 0o700 });
const info = await lstat(runtime);
if (
  !info.isDirectory() ||
  info.isSymbolicLink() ||
  (process.platform!=='win32' && info.uid !== process.getuid?.())
)
  throw new Error("UNSAFE_RUNTIME_DIRECTORY");
await chmod(runtime, 0o700);
const testPort = process.env.WINDI_TEST_TCP_PORT
  ? Number(process.env.WINDI_TEST_TCP_PORT)
  : 0;
if (!testPort && (await lstat(socketPath).catch(() => null))) {
  const alive = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection(socketPath);
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", (error: any) => {
      if (error.code === "ECONNREFUSED" || error.code === "ENOENT")
        resolve(false);
      else {
        console.error(error);
        process.exit(1);
      }
    });
  });
  if (alive) throw new Error("DAEMON_ALREADY_RUNNING");
  await unlink(socketPath);
}
const store = await openStore(databasePath);
const execFile = promisify(execFileCallback);
store.markRunningUnknown();
type Connection = { socket: net.Socket; profile: string };
const connections = new Map<Provider, Connection>();
const pending = new Map<
  string,
  {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
    provider: Provider;
  }
>();
const profileFile = path.join(home, "profile.json");
let profile = await loadProfile(profileFile);
const send = (socket: net.Socket, message: unknown) =>
  socket.write(`${JSON.stringify(message)}\n`);
const writeProfile = profileWriter(profileFile);
const saveProfile = () => writeProfile(profile);
const running = new Set<Provider>();
const lastProject = new Map<Provider, string>();
let grokWebStatus={authenticated:false,authPending:false,transport:'web',error:null as string|null};
const grokMedia = new GrokWebMedia(store,stagingRoot,(op,args)=>command('grok',op,args),()=>broadcast('grok'));
// Resume only identifiable Grok requests after a restart. Legacy recovery is unchanged.
function recoverKnownGrokJobs(){
for(const row of store.db.prepare("SELECT * FROM jobs WHERE provider='grok' AND status='unknown_result'").all() as JobRow[]){
  const result=resultOf(row);
  if(result.downloadPath||result.transport==='web'&&(result.webDownloadId||result.postUrl||result.uiVideo&&row.submitted_at))store.updateJob(row.id,{status:'queued',error_code:null,user_message:null});
}
}
recoverKnownGrokJobs();


function statusFor(provider: Provider) {
  return {
    provider,
    connected: connections.has(provider),
    paired: Boolean(profile[provider]),
    ...(provider==='grok'?{...grokWebStatus,authenticated:connections.has('grok')&&grokWebStatus.authenticated,backendConnected:true}:{}),
    ...store.providerSummary(provider),
  };
}
function broadcast(provider: Provider) {
  const connection = connections.get(provider);
  if (connection)
    send(connection.socket, {
      type: "status",
      version: VERSION,
      status: statusFor(provider),
    });
}

async function assetAction(action: string, args: any) {
  const source = path.resolve(String(args?.path || ""));
  if (!path.isAbsolute(source) || (!source.startsWith("/Users/win/Documents/") && !store.db.prepare("SELECT id FROM assets WHERE path=? AND provider='grok'").get(source)))
    throw new Error("ASSET_PATH_REJECTED");
  const grokAsset=store.db.prepare("SELECT * FROM assets WHERE path=? AND provider='grok'").get(source);
  if(grokAsset){
    if(action==='asset.open'){
      if(process.platform==='win32')await execFile('explorer.exe',[`/select,${source}`]);else await execFile('/usr/bin/open',['-R',source]);return {opened:true};
    }
    const thumb=await readFile(`${source}.thumb.jpg`);return {mime:'image/jpeg',data:thumb.toString('base64')};
  }
  const info = await inspectOriginal(source);
  if (action === "asset.preview") {
    const thumbnail = await sharp(source)
      .resize(96, 96, { fit: "cover" })
      .jpeg({ quality: 72 })
      .toBuffer();
    return { mime: "image/jpeg", width: info.width, height: info.height, data: thumbnail.toString("base64") };
  }
  if (action === "asset.open") {
    if(process.platform==='win32')await execFile('explorer.exe',[`/select,${source}`]);
    else await execFile("/usr/bin/open", ["-R", source]);
    return { opened: true };
  }
  throw new Error("ASSET_ACTION_UNSUPPORTED");
}
function command(provider: Provider, op: string, args: any = {}) {
  const connection = connections.get(provider);
  if (!connection) throw new Error("EXTENSION_DISCONNECTED");
  const id = randomUUID();
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("BRIDGE_TIMEOUT_RESULT_UNKNOWN"));
    }, 65_000);
    pending.set(id, { resolve, reject, timer, provider });
    send(connection.socket, {
      type: "command",
      version: VERSION,
      id,
      op,
      args,
    });
  });
}
async function rawBrowser(provider: Provider, op: string, args: any = {}) {
  if(provider==='grok')throw new Error('GROK_BROWSER_OPERATIONS_UNSUPPORTED');
  if (
    ![
      "open",
      "snapshot",
      "click",
      "fill",
      "key",
      "upload",
      "downloads",
      "trackDownload",
      "flowEnsureWorkspace",
      "flowDirectStatus",
      "flowRefreshSession",
      "flowDirectGenerate",
      "flowBackgroundSubmit",
      "flowBackgroundResult",
      "flowUiInspect",
      "flowUiAttachReferences",
      "flowResetSubmission",
      "flowReferenceBegin",
      "flowReferenceChunk",
      "flowReferenceFinish",
      "flowRecoverDownload",
      "chatgptSaveOriginal",
      "detachDebugger",
      "reloadExtension",
    ].includes(op)
  )
    throw new Error("INVALID_BROWSER_OPERATION");
  if (op === "open") {
    args.url ||= providerUrl(provider);
    if (!allowedUrl(provider, args.url))
      throw new Error("PROVIDER_URL_REJECTED");
  }
  if(op==='flowUiAttachReferences'){
    const job=store.job(String(args.jobId||''));
    if(!job||job.provider!=='flow'||!Array.isArray(args.files)||args.files.length>4)throw new Error('REFERENCE_NOT_OWNED_BY_JOB');
    const project=store.projectById(job.project_id);if(!project)throw new Error('PROJECT_NOT_REGISTERED');
    const owned=[...store.references(job),job.source_path];
    args.files=await Promise.all(args.files.map(async(file:string)=>{if(!owned.includes(file))throw new Error('REFERENCE_NOT_OWNED_BY_JOB');const safe=await safeFile(project.root,file);await inspectOriginal(safe);return safe;}));
  }
  if (op === "upload") {
    if (
      !Array.isArray(args.files) ||
      !args.files.length ||
      args.files.length > 5
    )
      throw new Error("INVALID_UPLOAD");
    args.files = await Promise.all(
      args.files.map(async (file: string) => {
        if (!path.isAbsolute(file))
          throw new Error("ABSOLUTE_UPLOAD_PATH_REQUIRED");
        const fileInfo = await lstat(file);
        if (
          !fileInfo.isFile() ||
          fileInfo.isSymbolicLink() ||
          fileInfo.size > 20 * 1024 * 1024
        )
          throw new Error("INVALID_UPLOAD_FILE");
        return file;
      }),
    );
  }
  return command(provider, op, args);
}
const browser: BrowserBridge = {
  open: (provider, url) => rawBrowser(provider, "open", { url }),
  snapshot: (provider, tabId) => rawBrowser(provider, "snapshot", { tabId }),
  click: (provider, tabId, node) =>
    rawBrowser(provider, "click", { tabId, node }),
  fill: (provider, tabId, node, text) =>
    rawBrowser(provider, "fill", { tabId, node, text }),
  key: (provider, tabId, key) => rawBrowser(provider, "key", { tabId, key }),
  upload: (provider, tabId, node, files) =>
    rawBrowser(provider, "upload", { tabId, node, files }),
  trackDownload: (provider, tabId, jobId) =>
    rawBrowser(provider, "trackDownload", { tabId, jobId }),
  downloads: (provider) => rawBrowser(provider, "downloads", {}),
  flowEnsureWorkspace: (projectId) => rawBrowser("flow", "flowEnsureWorkspace", { projectId }),
  flowUiAttachReferences: (tabId,args) => rawBrowser("flow","flowUiAttachReferences",{tabId,...args}),
  flowDirectStatus: (tabId) => rawBrowser("flow", "flowDirectStatus", { tabId }),
  flowRecoverDownload: (tabId, args) => rawBrowser("flow", "flowRecoverDownload", {tabId,...args}),
  flowRefreshSession: (tabId) => rawBrowser("flow", "flowRefreshSession", { tabId }),
  flowUploadReference: async (tabId,{jobId,file}) => {
    const job=store.job(jobId);if(!job||job.provider!=='flow'||!([...store.references(job),job.source_path].includes(file)))throw new Error('REFERENCE_NOT_OWNED_BY_JOB');
    const project=store.projectById(job.project_id);if(!project)throw new Error('PROJECT_NOT_REGISTERED');
    const safe=await safeFile(project.root,file);const info=await inspectOriginal(safe);
    const bytes=await readFile(safe);
    if(bytes.length>20*1024*1024)throw new Error('REFERENCE_TOO_LARGE');
    const sha256=createHash('sha256').update(bytes).digest('hex');
    const common={tabId,jobId,sha256};
    const begin=await rawBrowser('flow','flowReferenceBegin',{...common,mime:info.mime,name:path.basename(safe),size:bytes.length});
    if(begin.mediaId)return begin;
    const encoded=bytes.toString('base64');
    for(let offset=0,index=0;offset<encoded.length;offset+=524288,index++)await rawBrowser('flow','flowReferenceChunk',{...common,index,data:encoded.slice(offset,offset+524288)});
    return rawBrowser('flow','flowReferenceFinish',common);
  },
  flowDirectGenerate: (tabId, args) => rawBrowser("flow", "flowDirectGenerate", { tabId, ...args }),
  flowBackgroundSubmit: (tabId, args) => rawBrowser("flow", "flowBackgroundSubmit", {tabId,...args}),
  flowBackgroundResult: (tabId, args) => rawBrowser("flow", "flowBackgroundResult", {tabId,...args}),
  chatgptSaveOriginal: (tabId, args) => rawBrowser("chatgpt", "chatgptSaveOriginal", { tabId, ...args }),
  detachDebugger: (tabId) => rawBrowser("flow", "detachDebugger", { tabId }),
};

function messageFor(error: unknown) {
  const value = error instanceof Error ? error.message : String(error);
  const map: Record<string, string> = {
    EXTENSION_DISCONNECTED:
      "Extension chưa kết nối. Hãy mở popup Windi Connect và kết nối lại.",
    TAB_NOT_OWNED_OR_WRONG_PROVIDER:
      "Tab xử lý chưa thuộc Windi Connect. Hãy mở popup, bấm Mở tab xử lý cho provider này rồi tiếp tục cùng job.",
    BRIDGE_TIMEOUT_RESULT_UNKNOWN:
      "Mất kết nối trong lúc provider xử lý. Windi không gửi lại để tránh tạo ảnh trùng.",
    FLOW_BACKGROUND_UNAVAILABLE: "Trình duyệt chưa hỗ trợ thao tác Flow ở nền. Cập nhật trình duyệt/extension rồi tiếp tục cùng job. Windi giữ trạng thái gửi để tránh tạo trùng.",
    DOWNLOAD_NOT_OBSERVED: "Không tìm thấy file ảnh gốc được tải từ provider.",
    UNSUPPORTED_OR_CORRUPT_IMAGE: "File tải về không phải ảnh gốc hợp lệ.",
    INVALID_DOWNLOADED_FILE: "File tải về không hợp lệ hoặc quá lớn.",
  };
  return map[value] || value;
}
async function run(job: JobRow) {
  const provider = job.provider;
  try {
    broadcast(provider);
    const download = (await runProviderJob(store, browser, job)) as Download;
    const current = store.job(job.id);
    if (!current) return;
    const project = store.projectById(current.project_id);
    if (!project) throw new Error("PROJECT_NOT_REGISTERED");
    if (!download.filename) throw new Error("DOWNLOAD_NOT_OBSERVED");
    const staged = await stageOriginal(current, download.filename);
    store.updateJob(job.id, { staging_path: staged.path });
    if (store.job(job.id)?.status === "cancelled") return;
    if(current.provider==='flow'){const {aspect}=flowImageOptions(JSON.parse(current.options_json||'{}'),current.prompt);assertFlowImageAspect(aspect,staged.width,staged.height);}
    const duplicate = store.duplicateAsset(current.project_id,current.provider,staged.sha256,current.id);
    if(duplicate){
      store.updateJob(job.id,{
        status:"needs_user_action",
        error_code:"DUPLICATE_ASSET_MISMATCH",
        user_message:"Ảnh tải về trùng hoàn toàn với một job khác trong project. Windi không gán ảnh này cho prompt hiện tại.",
        result_json:JSON.stringify({reconcileExisting:true}),
        staging_path:null,
        completed_at:null,
      });
      return;
    }
    const asset = await publishStaged(current, project.root, staged);
    await sharp(asset.path).resize(96, 96, { fit: "cover" }).jpeg({ quality: 72 }).toFile(`${asset.path}.thumb.jpg`);
    store.addAsset({
      job: current,
      path: asset.path,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      sha256: asset.sha256,
    });
    store.updateJob(job.id, {
      status: "complete",
      staging_path: asset.stagingPath,
      result_json: JSON.stringify({
        path: asset.path,
        mime: asset.mime,
        width: asset.width,
        height: asset.height,
        sha256: asset.sha256,
      }),
      completed_at: new Date().toISOString(),
      error_code: null,
      user_message: null,
    });
    if(download.jobId===job.id)await cleanupDownloadedOriginal(download.filename,asset.path,asset.sha256).catch(error=>console.warn('DOWNLOAD_CLEANUP_FAILED',job.id,error instanceof Error?error.message:String(error)));
  } catch (error) {
    const current = store.job(job.id);
    if (!current || current.status === "cancelled") return;
    const code =
      error instanceof ProviderActionRequired
        ? error.code
        : error instanceof Error
          ? error.message
          : "UNEXPECTED_ERROR";
    const message =
      error instanceof ProviderActionRequired
        ? error.message
        : messageFor(error);
    const rejectedBeforeAcceptance = provider==='flow' && (
      /^FLOW_UI_(?:PROMPT_|SETTINGS_|IMAGE_|COUNT_|MODEL_|ASPECT_|START_|REFERENCE_)/.test(code) ||
      /^FLOW_DIRECT_(?:HTTP_(?:400|401|403|409|429)|SESSION_NOT_READY|CAPTCHA_UNAVAILABLE)$/.test(code) ||
      code==='FLOW_UNUSUAL_ACTIVITY');
    if(rejectedBeforeAcceptance)store.updateJob(job.id,{submitted_at:null});
    if (rejectedBeforeAcceptance || error instanceof ProviderActionRequired || userActionErrors.has(code))
      store.updateJob(job.id, {
        status: "needs_user_action",
        error_code: code,
        user_message: message,
      });
    else if (
      ["submitted", "generating", "downloading"].includes(current.status) &&
      /DISCONNECTED|TIMEOUT|RESULT_UNKNOWN|RESULT_NEEDS_RECONCILIATION|FLOW_ORIGINAL_|DOWNLOAD_/.test(code)
    )
      store.updateJob(job.id, {
        status: "unknown_result",
        error_code: "RESULT_NEEDS_RECONCILIATION",
        user_message: message,
      });
    else
      store.updateJob(job.id, {
        status: "failed",
        error_code: code,
        user_message: message,
        completed_at: new Date().toISOString(),
      });
  } finally {
    running.delete(provider);
    broadcast(provider);
    void schedule();
  }
}
async function runGrok(job:JobRow){
  try{await grokMedia.run(job);}catch(error){
    const current=store.job(job.id);if(!current||current.status==='cancelled')return;
    const code=error instanceof Error&&/^GROK_[A-Z0-9_]+$/.test(error.message)?error.message:'GROK_OPERATION_FAILED';
    const unknown=Boolean(current.submitted_at)&&/UNKNOWN|TIMEOUT|NETWORK|DOWNLOAD|OPERATION_FAILED/.test(code);
    const action=/LOGIN|AUTH|ENTITLEMENT|QUOTA|JOB_ACTIVE/.test(code);
    const beforeSubmit=/^GROK_UI_(CONTROL_MISSING|OPTION_UNAVAILABLE|OPTION_NOT_APPLIED|COMPOSER_MISSING|SUBMIT_UNAVAILABLE|WRONG_PAGE|REFERENCE_NOT_LISTED|REFERENCE_NOT_ATTACHED|UPLOAD_MISSING)$/.test(code);
    if(beforeSubmit)store.updateJob(job.id,{submitted_at:null});
    if(beforeSubmit||!current.submitted_at)await command('grok','ui.release',{jobId:job.id}).catch(()=>{});
    const messages:Record<string,string>={GROK_UI_OPTION_UNAVAILABLE:'Tuỳ chọn video không có trên tài khoản Grok này; chưa gửi lệnh tạo.',GROK_UI_REFERENCE_NOT_LISTED:'Ảnh chưa xuất hiện trong Uploads; chưa gửi lệnh tạo video.',GROK_VIDEO_ASPECT_MISMATCH:'Video Grok trả về sai tỉ lệ đã chọn. Tệp gốc được giữ lại; không tự tạo lại.',GROK_VIDEO_DURATION_MISMATCH:'Video Grok trả về sai thời lượng đã chọn. Tệp gốc được giữ lại; không tự tạo lại.',GROK_JOB_ACTIVE:'Một job Grok cũ vẫn đang chờ kết quả. Tiếp tục hoặc huỷ job đó trước.',GROK_LOGIN_REQUIRED:'Đăng nhập Grok để tiếp tục.',GROK_ENTITLEMENT_REQUIRED:'Tài khoản Grok chưa có quyền sử dụng chức năng này.',GROK_QUOTA_EXCEEDED:'Grok đang giới hạn quota. Thử tiếp tục job sau.',GROK_RESULT_UNKNOWN:'Chưa xác định kết quả Grok; không gửi lại tự động.'};
    store.updateJob(job.id,{status:unknown?'unknown_result':action?'needs_user_action':'failed',error_code:code,user_message:messages[code]||code});
  }finally{running.delete('grok');broadcast('grok');void schedule();}
}
async function schedule() {
  if(!running.has('grok')&&connections.has('grok')&&grokWebStatus.authenticated){
    const next=store.nextQueued('grok',lastProject.get('grok')||null);
    if(next){running.add('grok');lastProject.set('grok',next.project_id);void runGrok(next);}
  }

  for (const provider of ["flow", "chatgpt"] as Provider[]) {
    if (running.has(provider) || !connections.has(provider)) continue;
    const next = store.nextQueued(provider, lastProject.get(provider) || null);
    if (!next) continue;
    running.add(provider);
    lastProject.set(provider, next.project_id);
    void run(next);
  }
}
async function fileFingerprint(file: string) {
  const input = await readFile(file);
  return createHash("sha256").update(input).digest("hex");
}
async function createJob(args: any) {
  if(args.provider==='grok'){const created=await createGrokJob(store,args);if(!created.reused&&(!connections.has('grok')||!grokWebStatus.authenticated))store.updateJob(created.job.id,{status:'needs_user_action',error_code:'GROK_LOGIN_REQUIRED',user_message:'Chạy windi grok login, rồi windi jobs resume với ID của job này.'});broadcast('grok');void schedule();return {job:serializeJob(store.job(created.job.id)!),reused:created.reused};}
  const provider = validProvider(args.provider);
  const kind = args.kind as JobKind;
  if (kind !== "create" && kind !== "edit") throw new Error("INVALID_JOB_KIND");
  const { project } = await loadedProject(store, args.project);
  const prompt =
    typeof args.prompt === "string"
      ? { content: args.prompt }
      : await readProjectText(project.root, args.promptFile);
  if (!prompt.content.trim()) throw new Error("PROMPT_FILE_EMPTY");
  if (prompt.content.length > 24_000) throw new Error("INVALID_TEXT");
  const options = provider==='flow' ? flowImageOptions(args,prompt.content) : undefined;
  const count = provider==='flow' ? flowVariantCount(args.count) : 1;
  if(provider!=='flow'&&(args.aspect!==undefined||args.model!==undefined||args.seed!==undefined||args.count!==undefined))throw new Error('IMAGE_OPTIONS_REQUIRE_FLOW_OR_GROK');
  const references = Array.isArray(args.references) ? args.references : [];
  if (references.length + (kind === "edit" ? 1 : 0) > 4) throw new Error("TOO_MANY_REFERENCES");
  const referenceFiles = await Promise.all(
    references.map(async (file: string) => {
      const safe = await safeFile(project.root, file);
      const item = await stat(safe);
      if (item.size > 20 * 1024 * 1024) throw new Error("REFERENCE_TOO_LARGE");
      await inspectOriginal(safe);
      return safe;
    }),
  );
  const source =
    kind === "edit" ? await safeFile(project.root, args.input) : null;
  if (kind === "edit" && !source) throw new Error("EDIT_INPUT_REQUIRED");
  if (source) await inspectOriginal(source);
  const output = await safeOutput(project.root, args.output);
  const outputRelative = path.relative(project.root, output);
  const contents = {
    provider,
    kind,
    prompt: prompt.content,
    source: source ? await fileFingerprint(source) : null,
    references: await Promise.all(referenceFiles.map(fileFingerprint)),
    output: outputRelative,
    ...(options&&(args.aspect!==undefined||args.model!==undefined||args.seed!==undefined||count!==1)?{options,count}:{}),
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(contents))
    .digest("hex");
  if(args.requestKey){
    const family=[args.requestKey,...[1,2,3,4].map(n=>`${args.requestKey}:v1-of-${n}`)];
    const expected=count===1?args.requestKey:`${args.requestKey}:v1-of-${count}`;
    for(const key of family){if(key!==expected&&store.db.prepare('SELECT id FROM jobs WHERE project_id=? AND request_key=?').get(project.id,key))throw new Error('REQUEST_KEY_CONTENT_MISMATCH');}
  }
  const inputs = [];
  for(let index=0;index<count;index++){
    const ext=path.extname(outputRelative);
    const variantOutput=count===1?outputRelative:`${ext?outputRelative.slice(0,-ext.length):outputRelative}-${String(index+1).padStart(2,'0')}${ext}`;
    const variantOptions=options?{...options,...(options.seed===undefined?{}:{seed:(options.seed+index)%2147483648})}:undefined;
    inputs.push({projectId:project.id,provider,kind,
      requestKey:args.requestKey?(count===1?args.requestKey:`${args.requestKey}:v${index+1}-of-${count}`):undefined,
      fingerprint:count===1?fingerprint:createHash('sha256').update(`${fingerprint}:${index}`).digest('hex'),
      prompt:prompt.content,sourcePath:source,references:referenceFiles,outputPath:variantOutput,options:variantOptions});
  }
  const variants=store.insertJobs(inputs).map(created=>({job:serializeJob(created.job),reused:created.reused}));
  broadcast(provider);
  void schedule();
  return count===1?variants[0]:{jobs:variants.map(item=>item.job),reused:variants.every(item=>item.reused)};
}
function serializeJob(job: JobRow) {
  return {
    ...job,
    references: store.references(job),
    options: job.options_json ? JSON.parse(job.options_json) : null,
    result: job.result_json ? JSON.parse(job.result_json) : null,
  };
}
async function recoverStaged(job: JobRow) {
  if (!job.staging_path) throw new Error("STAGED_ASSET_NOT_FOUND");
  const project = store.projectById(job.project_id);
  if (!project) throw new Error("PROJECT_NOT_REGISTERED");
  const staged = await inspectOriginal(job.staging_path);
  const asset = await publishStaged(job, project.root, staged);
  store.addAsset({
    job,
    path: asset.path,
    mime: asset.mime,
    width: asset.width,
    height: asset.height,
    sha256: asset.sha256,
  });
  return store.updateJob(job.id, {
    status: "complete",
    result_json: JSON.stringify({
      path: asset.path,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      sha256: asset.sha256,
    }),
    completed_at: new Date().toISOString(),
    error_code: null,
    user_message: null,
  })!;
}

async function importJobAsset(args: any) {
  const job = store.job(String(args.id || ""));
  if (!job) throw new Error("JOB_NOT_FOUND");
  const { project } = await loadedProject(store, args.project);
  if (job.project_id !== project.id) throw new Error("JOB_PROJECT_MISMATCH");
  if (["queued", "preparing", "submitted", "generating", "downloading"].includes(job.status))
    throw new Error("JOB_STILL_ACTIVE");
  if (job.status === "cancelled" && !job.submitted_at)
    throw new Error("CANCELLED_JOB_WAS_NOT_SUBMITTED");
  const existing = store.assetForJob(job.id);
  if (existing && args.replace !== true) throw new Error("ASSET_ALREADY_COMPLETE_USE_--REPLACE");
  const source = path.resolve(String(args.file || ""));
  if (!path.isAbsolute(String(args.file || ""))) throw new Error("ABSOLUTE_IMPORT_PATH_REQUIRED");
  const sourceInfo = await lstat(source).catch(() => null);
  if (!sourceInfo?.isFile() || sourceInfo.isSymbolicLink()) throw new Error("INVALID_IMPORT_FILE");
  if(job.provider==='grok'&&JSON.parse(job.options_json||'{}').media==='video')throw new Error('GROK_VIDEO_IMPORT_UNSUPPORTED_USE_RESUME');
  const staged = await stageOriginal(job, source);
  const duplicate = store.duplicateAsset(job.project_id, job.provider, staged.sha256, job.id);
  if (duplicate) throw new Error(`DUPLICATE_ASSET_MISMATCH:${duplicate.job_id}`);

  let quarantined: string | null = null;
  if (existing) {
    const current = await safeFile(project.root, existing.path);
    const extension = path.extname(current);
    const base = path.basename(current, extension);
    const requested = await safeOutput(
      project.root,
      path.join(".windi", "quarantine", `${base}-replaced-${Date.now()}${extension}`),
    );
    quarantined = await uniqueOutput(requested);
    await rename(current, quarantined);
  }

  const asset = await publishStaged(job, project.root, staged);
  store.setAsset({
    job,
    path: asset.path,
    mime: asset.mime,
    width: asset.width,
    height: asset.height,
    sha256: asset.sha256,
  });
  const updated = store.updateJob(job.id, {
    status: "complete",
    staging_path: asset.stagingPath,
    result_json: JSON.stringify({
      path: asset.path,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      sha256: asset.sha256,
      imported: true,
      quarantined,
    }),
    completed_at: new Date().toISOString(),
    error_code: null,
    user_message: null,
  })!;
  store.event(job.id, "asset.imported", { source, path: asset.path, sha256: asset.sha256, quarantined });
  broadcast(job.provider);
  return { job: serializeJob(updated), quarantined };
}

async function continueWorkflow(projectRoot: string) {
  const { project } = await loadedProject(store, projectRoot);
  let state = await advanceWorkflow(project.root);
  const queued = [];
  if (state.stage === "assets") {
    const manifest = await buildImageManifest(project.root, state);
    for (const item of manifest.jobs) {
      const created = await createJob({
        project: project.root,
        provider: item.provider,
        ...(['flow','grok'].includes(item.provider)?{aspect:item.aspect}:{}),
        kind: item.kind,
        promptFile: path.join(project.root, item.promptFile),
        references: item.references.map((file) =>
          path.join(project.root, file),
        ),
        output: item.output,
        requestKey: item.requestKey,
      });
      queued.push(created);
    }
    state = await loadWorkflow(project.root);
  }
  return { workflow: serializeWorkflow(state), queued };
}

const server = net.createServer((socket) => {
  let role: "cli" | "extension" | undefined, provider: Provider | undefined;
  const respond = (id: string, result: any, error?: string) =>
    send(socket, { id, result, error });
  socket.on("data", (chunk) => {
    try {
      parse(chunk);
    } catch {
      socket.destroy();
    }
  });
  // Native Messaging can deliver hello and the first status request in one
  // packet. Preserve their order instead of racing two async handlers.
  let sequence = Promise.resolve();
  const parse = parseLines((message) => {
    sequence = sequence
      .then(() => handle(message))
      .catch((error) => {
        respond(
          message.id,
          null,
          error instanceof Error ? error.message : String(error),
        );
      });
  });
  async function handle(message: any) {
    if (message.version !== VERSION)
      throw new Error("PROTOCOL_VERSION_MISMATCH");
    if (message.type === "extension.hello") {
      if (role) throw new Error("ALREADY_IDENTIFIED");
      provider = validProvider(message.provider);
      if (typeof message.profile !== "string" || !message.profile)
        throw new Error("PROFILE_REQUIRED");
      if (!profile[provider]) {
        profile[provider] = message.profile;
        await saveProfile();
      } else if (profile[provider] !== message.profile) {
        if (message.reset === true) {
          profile[provider] = message.profile;
          await saveProfile();
        } else throw new Error("PAIRING_REQUIRES_RESET");
      }
      const existing = connections.get(provider);
      if (existing && existing.socket !== socket) existing.socket.destroy();
      role = "extension";
      connections.set(provider, { socket, profile: message.profile });
      send(socket, { type: "connected", version: VERSION });
      broadcast(provider);
      if(provider==='grok')void command('grok','web.status').then(result=>{grokWebStatus={...grokWebStatus,...result,error:null};recoverKnownGrokJobs();broadcast('grok');void schedule();}).catch(()=>{grokWebStatus={...grokWebStatus,authenticated:false};broadcast('grok');});
      void schedule();
      return;
    }
    if (message.type === "reply") {
      if (role !== "extension") throw new Error("NOT_EXTENSION");
      const request = pending.get(message.id);
      if (request && request.provider === provider) {
        clearTimeout(request.timer);
        pending.delete(message.id);
        message.error
          ? request.reject(new Error(message.error))
          : request.resolve(message.result);
      }
      return;
    }
    if (message.type === "status.request") {
      if (role === "extension" && provider) broadcast(provider);
      return;
    }
    if ((!role || role === "extension") && (message.op === "asset.preview" || message.op === "asset.open")) {
      respond(message.id, await assetAction(message.op, message.args || {}));
      return;
    }
    if(message.op?.startsWith('grok.')){
      if(role==='extension'&&provider!=='grok')throw new Error('WRONG_PROVIDER');
      let result:any;
      if(message.op==='grok.status')result={...grokWebStatus,authenticated:connections.has('grok')&&grokWebStatus.authenticated};
      else if(message.op==='grok.login'||message.op==='grok.doctor'){
        try{grokWebStatus={...grokWebStatus,...await command('grok',message.op==='grok.login'?'web.login':'web.status'),error:null};result={...grokWebStatus,mediaGenerationVerified:false};}
        catch(error){grokWebStatus={...grokWebStatus,authenticated:false,error:error instanceof Error?error.message:'GROK_WEB_OPERATION_FAILED'};broadcast('grok');throw error;}
        void schedule();
      }else if(message.op==='grok.logout'){
        if(running.has('grok'))throw new Error('GROK_JOB_ACTIVE');
        if(connections.has('grok'))await command('grok','web.disconnect');
        grokWebStatus={...grokWebStatus,authenticated:false,error:null};result=grokWebStatus;
      }else throw new Error('UNKNOWN_OPERATION');
      broadcast('grok');respond(message.id,result);return;
    }
    if (role === "extension") throw new Error("NOT_CLI");
    role = "cli";
    if (message.op === "pair") {
      const p = validProvider(message.args.provider);
      if (profile[p] && profile[p] !== message.args.profile)
        throw new Error("PAIRING_REQUIRES_RESET");
      profile[p] = message.args.profile;
      await saveProfile();
      respond(message.id, { paired: true, deprecated: true });
      return;
    }
    if (message.op === "doctor") {
      respond(message.id, {
        version: VERSION,
        phase: "production-candidate",
        home,
        providers: Object.fromEntries(
          (["flow", "chatgpt", "grok"] as Provider[]).map((p) => [p, statusFor(p)]),
        ),
        database: databasePath,
      });
      return;
    }
    if (message.op === "project.init") {
      const initialized = await registerProject(
        store,
        message.args.project,
        message.args.mode || "prompt",
      );
      respond(message.id, initialized);
      return;
    }
    if (message.op === "project.link") {
      const { project } = await loadedProject(store, message.args.project);
      const provider = validProvider(message.args.provider);
      const url = String(message.args.url || "");
      if (!allowedUrl(provider, url)) throw new Error("PROVIDER_URL_REJECTED");
      if (provider === "flow" && !/\/project\/[0-9a-f-]{36}(?:\/|$)/i.test(new URL(url).pathname))
        throw new Error("FLOW_WORKSPACE_REQUIRED");
      respond(message.id, store.upsertWorkspace(project.id, provider, url, null));
      return;
    }
    if (message.op === "workflow.start") {
      const { project } = await loadedProject(store, message.args.project);
      respond(
        message.id,
        serializeWorkflow(
          await startWorkflow(project.root, project.id, message.args),
        ),
      );
      return;
    }
    if (message.op === "workflow.status") {
      const { project } = await loadedProject(store, message.args.project);
      respond(
        message.id,
        serializeWorkflow(await advanceWorkflow(project.root)),
      );
      return;
    }
    if (message.op === "workflow.artifact") {
      const { project } = await loadedProject(store, message.args.project);
      if (
        message.args.kind !== "idea" &&
        message.args.kind !== "layout" &&
        message.args.kind !== "script"
      )
        throw new Error("INVALID_WORKFLOW_ARTIFACT");
      respond(
        message.id,
        serializeWorkflow(
          await putWorkflowArtifact(
            project.root,
            message.args.kind,
            message.args.file,
          ),
        ),
      );
      return;
    }
    if (message.op === "workflow.layout.choose") {
      const { project } = await loadedProject(store, message.args.project);
      if (
        message.args.preset !== "paper-editorial" &&
        message.args.preset !== "dark-cinematic"
      )
        throw new Error("INVALID_LAYOUT_PRESET");
      respond(
        message.id,
        serializeWorkflow(
          await chooseBuiltinLayout(project.root, message.args.preset),
        ),
      );
      return;
    }
    if (message.op === "workflow.approve") {
      const { project } = await loadedProject(store, message.args.project);
      if (
        message.args.kind !== "idea" &&
        message.args.kind !== "layout" &&
        message.args.kind !== "script"
      )
        throw new Error("INVALID_APPROVAL_KIND");
      respond(
        message.id,
        serializeWorkflow(
          await approveWorkflow(
            project.root,
            message.args.kind,
            String(message.args.value || ""),
          ),
        ),
      );
      return;
    }
    if (message.op === "workflow.continue") {
      respond(message.id, await continueWorkflow(message.args.project));
      return;
    }
    if (message.op === "workflow.voice.import") {
      const { project } = await loadedProject(store, message.args.project);
      respond(
        message.id,
        serializeWorkflow(
          await registerVoiceArtifacts(
            project.root,
            message.args.audio,
            message.args.captions,
          ),
        ),
      );
      return;
    }
    if (message.op === "job.create") {
      respond(message.id, await createJob(message.args));
      return;
    }
    if (message.op === "job.get") {
      const job = store.job(message.args.id);
      if (!job) throw new Error("JOB_NOT_FOUND");
      respond(message.id, serializeJob(job));
      return;
    }
    if (message.op === "job.list") {
      const { project } = await loadedProject(store, message.args.project);
      respond(message.id, store.jobsForProject(project.id).map(serializeJob));
      return;
    }
    if (message.op === "job.resume") {
      const prior = store.job(message.args.id);
      if (!prior) throw new Error("JOB_NOT_FOUND");
      if(prior.provider==='grok'){
        const job=resumeGrokJob(store,prior,message.args.confirmNoResult===true);broadcast('grok');void schedule();respond(message.id,serializeJob(job));return;
      }
      if(prior.provider==='flow'&&message.args.confirmNoResult===true){
        if(!['unknown_result','needs_user_action'].includes(prior.status)||!['RESULT_NEEDS_RECONCILIATION','BRIDGE_TIMEOUT_RESULT_UNKNOWN'].includes(prior.error_code||''))throw new Error('JOB_NOT_AWAITING_RECONCILIATION');
        await rawBrowser('flow','flowResetSubmission',{jobId:prior.id,workspaceUrl:prior.workspace_url});
      }
      const job =
        prior.staging_path && prior.status !== "complete"
          ? await recoverStaged(prior)
          : message.args.confirmResult === true
            ? store.recoverAfterFoundResult(message.args.id)
            : message.args.confirmNoResult === true
              ? store.retryAfterNoResult(message.args.id)
            : store.resumeJob(message.args.id);
      broadcast(job.provider);
      void schedule();
      respond(message.id, serializeJob(job));
      return;
    }
    if (message.op === "job.import") {
      respond(message.id, await importJobAsset(message.args));
      return;
    }
    if (message.op === "job.cancel") {
      const job = store.cancelJob(message.args.id);
      if(job.provider==='grok')await command('grok','ui.release',{jobId:job.id}).catch(()=>{});
      broadcast(job.provider);
      respond(message.id, serializeJob(job));
      return;
    }
    if (message.op === "browser") {
      const p = validProvider(message.args.provider);
      respond(
        message.id,
        await rawBrowser(p, message.args.action, message.args.args || {}),
      );
      return;
    }
    throw new Error("UNKNOWN_OPERATION");
  }
  socket.on("error", () => {});
  socket.on("close", () => {
    if (provider && connections.get(provider)?.socket === socket) {
      connections.delete(provider);
      for (const [id, request] of pending) {
        if (request.provider === provider) {
          clearTimeout(request.timer);
          pending.delete(id);
          request.reject(new Error("EXTENSION_DISCONNECTED"));
        }
      }
      broadcast(provider);
    }
  });
});
server.listen(
  testPort ? { host: "127.0.0.1", port: testPort } : socketPath,
  async () => {
    if (!testPort && process.platform!=='win32') await chmod(socketPath, 0o600);
    console.error("Windi Connect production candidate ready");
    void schedule();
  },
);
for (const signal of ["SIGINT", "SIGTERM"] as NodeJS.Signals[])
  process.on(signal, () => {
    server.close();
    store.close();
    process.exit(0);
  });
