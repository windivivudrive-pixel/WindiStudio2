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
  info.uid !== process.getuid?.()
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
let profile = JSON.parse(
  await readFile(profileFile, "utf8").catch(() => "{}"),
) as Partial<Record<Provider, string>>;
const send = (socket: net.Socket, message: unknown) =>
  socket.write(`${JSON.stringify(message)}\n`);
const saveProfile = () =>
  writeFile(profileFile, JSON.stringify(profile), { mode: 0o600 });
const running = new Set<Provider>();
const lastProject = new Map<Provider, string>();

function statusFor(provider: Provider) {
  return {
    provider,
    connected: connections.has(provider),
    paired: Boolean(profile[provider]),
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
  if (!path.isAbsolute(source) || !source.startsWith("/Users/win/Documents/"))
    throw new Error("ASSET_PATH_REJECTED");
  const info = await inspectOriginal(source);
  if (action === "asset.preview") {
    const thumbnail = await sharp(source)
      .resize(96, 96, { fit: "cover" })
      .jpeg({ quality: 72 })
      .toBuffer();
    return { mime: "image/jpeg", width: info.width, height: info.height, data: thumbnail.toString("base64") };
  }
  if (action === "asset.open") {
    await execFile("/usr/bin/open", ["-R", source]);
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
      "flowDirectStatus",
      "flowRefreshSession",
      "flowDirectGenerate",
      "flowReferenceBegin",
      "flowReferenceChunk",
      "flowReferenceFinish",
      "flowRecoverDownload",
      "chatgptSaveOriginal",
    ].includes(op)
  )
    throw new Error("INVALID_BROWSER_OPERATION");
  if (op === "open") {
    args.url ||= providerUrl(provider);
    if (!allowedUrl(provider, args.url))
      throw new Error("PROVIDER_URL_REJECTED");
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
  flowDirectStatus: (tabId) => rawBrowser("flow", "flowDirectStatus", { tabId }),
  flowRecoverDownload: (tabId, args) => rawBrowser("flow", "flowRecoverDownload", {tabId,...args}),
  flowRefreshSession: (tabId) => rawBrowser("flow", "flowRefreshSession", { tabId }),
  flowUploadReference: async (tabId,{jobId,file}) => {
    const job=store.job(jobId);if(!job||job.provider!=='flow'||!store.references(job).includes(file))throw new Error('REFERENCE_NOT_OWNED_BY_JOB');
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
  chatgptSaveOriginal: (tabId, args) => rawBrowser("chatgpt", "chatgptSaveOriginal", { tabId, ...args }),
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
    if (error instanceof ProviderActionRequired || userActionErrors.has(code))
      store.updateJob(job.id, {
        status: "needs_user_action",
        error_code: code,
        user_message: message,
      });
    else if (
      ["submitted", "generating", "downloading"].includes(current.status) &&
      /DISCONNECTED|TIMEOUT|RESULT_UNKNOWN/.test(code)
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
async function schedule() {
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
  const references = Array.isArray(args.references) ? args.references : [];
  if (references.length > 4) throw new Error("TOO_MANY_REFERENCES");
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
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(contents))
    .digest("hex");
  const created = store.insertJob({
    projectId: project.id,
    provider,
    kind,
    requestKey: args.requestKey || undefined,
    fingerprint,
    prompt: prompt.content,
    sourcePath: source,
    references: referenceFiles,
    outputPath: outputRelative,
  });
  broadcast(provider);
  void schedule();
  return { job: serializeJob(created.job), reused: created.reused };
}
function serializeJob(job: JobRow) {
  return {
    ...job,
    references: store.references(job),
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
          (["flow", "chatgpt"] as Provider[]).map((p) => [p, statusFor(p)]),
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
    if (!testPort) await chmod(socketPath, 0o600);
    console.error("Windi Connect production candidate ready");
  },
);
for (const signal of ["SIGINT", "SIGTERM"] as NodeJS.Signals[])
  process.on(signal, () => {
    server.close();
    store.close();
    process.exit(0);
  });
