#!/usr/bin/env node
import {cleanWorkflowImages} from './watermark.ts';
import {environmentStatus} from './environment-status.ts';
import {runPipeline} from './pipeline.ts';
import net from "node:net";
import {execFile} from "node:child_process";
import path from "node:path";
import { access, readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { socketPath, VERSION, parseLines, isTerminal } from "./protocol.ts";
import { previewVideo, renderVideo } from "./render.ts";
import { prepareWhisper, transcribeLocal } from "./transcribe.ts";
import {
  generateWorkflowVoice,
  listWorkflowVoices,
  loginVoice,
} from "./voice-api.ts";
import { readProjectText } from "./project.ts";
import {approveTikTokPost,checkTikTokSession,prepareTikTokPost,publishTikTokPost,tikTokPostStatus} from './tiktok-lightpanda.ts';
import {approveFacebookReel,checkFacebookPage,facebookReelStatus,prepareFacebookReel,refreshFacebookReel,submitFacebookReel} from './facebook-reels.ts';
import {approvePostizPost,inspectPostizPost,listPostizChannels,postizPostStatus,preparePostizPost,submitPostizPost} from './postiz-publish.ts';
import {
  activateLicense,
  licenseStatus,
} from "./license-api.ts";

export function request(op: string, args: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath),
      id = randomUUID();
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("DAEMON_TIMEOUT"));
    }, 70_000);
    socket.on("connect", () =>
      socket.write(JSON.stringify({ version: VERSION, id, op, args }) + "\n"),
    );
    socket.on(
      "data",
      parseLines((message) => {
        if (message.id !== id) return;
        clearTimeout(timer);
        socket.end();
        message.error
          ? reject(new Error(message.error))
          : resolve(message.result);
      }),
    );
    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
type Parsed = { positionals: string[]; flags: Map<string, string[]> };
function parse(argv: string[]): Parsed {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      positionals.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith("--") ? argv[++i] : "true";
    flags.set(key, [...(flags.get(key) || []), value]);
  }
  return { positionals, flags };
}
const value = (args: Parsed, name: string, required = false) => {
  const found = args.flags.get(name)?.at(-1);
  if (required && !found) throw new Error(`MISSING_--${name.toUpperCase()}`);
  return found;
};
const values = (args: Parsed, name: string) => args.flags.get(name) || [];
const has = (args: Parsed, name: string) => args.flags.has(name);
const projectPath = (args: Parsed) =>
  path.resolve(value(args, "project") || process.cwd());
function output(result: unknown, jsonMode: boolean) {
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (Array.isArray(result)) {
    for (const item of result)
      console.log(`${item.id}  ${item.status}  ${item.output_path}`);
    return;
  }
  const data = result as any;
  if (data?.job) {
    console.log(
      `Job ${data.job.id} · ${data.job.status}${data.reused ? " (dùng lại request trước)" : ""}`,
    );
    console.log(`Kết quả: ${data.job.output_path}`);
    return;
  }
  if (data?.id && data?.status) {
    console.log(`Job ${data.id} · ${data.status}`);
    if (data.user_message) console.log(data.user_message);
    if (data.result?.path) console.log(`Đã lưu: ${data.result.path}`);
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}
async function videoAnalyzerStatus() {
  const candidates = [
    path.join(homedir(), ".codex", "skills", "watch", "SKILL.md"),
    path.join(homedir(), ".agents", "skills", "watch", "SKILL.md"),
  ];
  for (const skill of candidates)
    if (await Promise.all([skill, 'scripts/watch.py', 'scripts/setup.py', 'LICENSE'].map(file => access(file === skill ? skill : path.join(path.dirname(skill), file)).then(() => true).catch(() => false))).then(checks => checks.every(Boolean)))
      return {
        ready: true,
        skill,
        repository: "https://github.com/bradautomates/claude-video",
      };
  return {
    ready: false,
    repository: "https://github.com/bradautomates/claude-video",
    install: "npx skills add bradautomates/claude-video -g --copy",
  };
}
async function waitFor(jobId: string, jsonMode: boolean) {
  for (;;) {
    const job = await request("job.get", { id: jobId });
    if (isTerminal(job.status)) {
      output(job, jsonMode);
      if (job.status !== "complete") process.exitCode = 1;
      return job;
    }
    if (job.status === "needs_user_action" || job.status === "unknown_result") {
      output(job, jsonMode);
      process.exitCode = 1;
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
}
async function init(args: Parsed) {
  const project = projectPath(args);
  let mode: "prompt" | "relink" | "fork" = has(args, "relink")
    ? "relink"
    : has(args, "fork")
      ? "fork"
      : "prompt";
  let result = await request("project.init", { project, mode });
  if (result.conflict && mode === "prompt") {
    if (!process.stdin.isTTY)
      throw new Error(
        "PROJECT_ID_PATH_CONFLICT: chạy lại với --relink hoặc --fork",
      );
    const io = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = (
      await io.question(
        `Project này đã từng ở ${result.conflict.oldRoot}. [r] liên kết lại / [f] tạo bản độc lập: `,
      )
    )
      .trim()
      .toLocaleLowerCase();
    io.close();
    if (
      answer !== "r" &&
      answer !== "relink" &&
      answer !== "f" &&
      answer !== "fork"
    )
      throw new Error("PROJECT_ID_PATH_CONFLICT");
    mode = answer.startsWith("r") ? "relink" : "fork";
    result = await request("project.init", { project, mode });
  }
  output(result, has(args, "json"));
}
async function project(args: Parsed) {
  const action = args.positionals[1];
  if (action === "init") return init(args);
  if (action === "link") {
    output(
      await request("project.link", {
        project: projectPath(args),
        provider: value(args, "provider", true),
        url: value(args, "url", true),
      }),
      has(args, "json"),
    );
    return;
  }
  throw new Error(
    "Usage: windi project init | link --provider flow|chatgpt --url URL",
  );
}
async function imagePayload(args: Parsed, kind: "create" | "edit", base: string) {
  const promptFile = path.resolve(base, value(args, "prompt-file", true)!);
  const prompt = (await readProjectText(base, promptFile)).content;
  return {
    project: base,
    provider: value(args, "provider", true),
    ...(["flow","grok"].includes(value(args,"provider")||"")?{aspect:value(args,"aspect"),resolution:value(args,"resolution"),model:value(args,"model"),quality:value(args,"quality"),seed:value(args,"seed"),count:value(args,"count")}:{}),
    kind,
    prompt,
    references: values(args, "ref").map((file) => path.resolve(base, file)),
    input:
      kind === "edit"
        ? path.resolve(base, value(args, "input", true)!)
        : undefined,
    output: value(args, "output", true),
    requestKey: value(args, "request-key"),
  };
}
async function grok(args:Parsed){
  const action=args.positionals[1]||'status';if(!['login','logout','status','doctor'].includes(action))throw new Error('Usage: windi grok login|logout|status|doctor');
  const result=await request(`grok.${action}`);output(result,has(args,'json'));
  if(action==='login'&&result.authorizationUrl&&!has(args,'no-browser')){
    const command=process.platform==='win32'?'rundll32.exe':process.platform==='darwin'?'/usr/bin/open':'xdg-open';
    const argv=process.platform==='win32'?['url.dll,FileProtocolHandler',result.authorizationUrl]:[result.authorizationUrl];
    await new Promise<void>((resolve)=>execFile(command,argv,()=>resolve()));
  }
}
async function videos(args:Parsed){
  if(args.positionals[1]!=='create'||value(args,'provider',true)!=='grok')throw new Error('Usage: windi videos create --provider grok --prompt-file FILE --output PATH ');
  const base=projectPath(args),payload=await imagePayload(args,'create',base),input=value(args,'input');
  const result=await request('job.create',{...payload,media:'video',input:input?path.resolve(base,input):undefined,duration:value(args,'duration'),aspect:value(args,'aspect'),resolution:value(args,'resolution'),model:value(args,'model')});
  output(result,has(args,'json'));if(has(args,'wait'))await waitFor(result.job.id,has(args,'json'));
}
async function images(args: Parsed) {
  if(args.positionals[1] === "clean") { output(await cleanWorkflowImages(projectPath(args)), has(args,"json")); return; }
  const action = args.positionals[1];
  const base = projectPath(args);
  const jsonMode = has(args, "json");
  if (action === "create" || action === "edit") {
    const result = await request(
      "job.create",
      await imagePayload(args, action, base),
    );
    output(result, jsonMode);
    if (has(args, "wait")) for(const job of result.jobs||[result.job]) await waitFor(job.id, jsonMode);
    return;
  }
  if (action === "batch") {
    const manifestPath = path.resolve(base, value(args, "manifest", true)!);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      manifest.version !== 1 ||
      !Array.isArray(manifest.jobs) ||
      !manifest.jobs.length
    )
      throw new Error("INVALID_BATCH_MANIFEST");
    const created = [];
    for (const item of manifest.jobs) {
      if (!["create", "edit"].includes(item.kind || "create"))
        throw new Error("INVALID_BATCH_JOB");
      const payload = {
        project: base,
        provider: item.provider,
        ...(['flow','grok'].includes(item.provider)?{aspect:item.aspect,resolution:item.resolution,model:item.model,quality:item.quality,seed:item.seed,count:item.count}:{}),
        kind: item.kind || "create",
        prompt: (
          await readProjectText(base, path.resolve(base, item.promptFile))
        ).content,
        references: (item.references || []).map((file: string) =>
          path.resolve(base, file),
        ),
        input: item.input ? path.resolve(base, item.input) : undefined,
        output: item.output,
        requestKey: item.requestKey,
      };
      created.push(await request("job.create", payload));
    }
    output(created, jsonMode);
    if (has(args, "wait"))
      for (const item of created) for(const job of item.jobs||[item.job]) await waitFor(job.id, jsonMode);
    return;
  }
  throw new Error("Usage: windi images create|edit|batch");
}
async function jobs(args: Parsed) {
  const action = args.positionals[1];
  const id = args.positionals[2];
  const jsonMode = has(args, "json");
  if (action === "status") {
    if (id) {
      const result = await request("job.get", { id });
      output(result, jsonMode);
    } else
      output(
        await request("job.list", { project: projectPath(args) }),
        jsonMode,
      );
    return;
  }
  if (action === "resume" || action === "cancel") {
    if (!id) throw new Error("JOB_ID_REQUIRED");
    if(has(args,"confirm-no-result")&&has(args,"confirm-result"))throw new Error("CHOOSE_ONE_RECONCILIATION_RESULT");
    const resumed=await request(`job.${action}`, { id, confirmNoResult: has(args, "confirm-no-result"), confirmResult: has(args,"confirm-result") });
    if(action==='resume'&&has(args,'wait'))await waitFor(id,jsonMode);else output(resumed,jsonMode);
    return;
  }
  if (action === "import") {
    if (!id) throw new Error("JOB_ID_REQUIRED");
    output(
      await request("job.import", {
        id,
        project: projectPath(args),
        file: path.resolve(value(args, "file", true)!),
        replace: has(args, "replace"),
      }),
      jsonMode,
    );
    return;
  }
  throw new Error("Usage: windi jobs status JOB_ID | resume JOB_ID | import JOB_ID --file FILE [--replace]");
}
async function workflow(args: Parsed) {
  const action = args.positionals[1],
    sub = args.positionals[2],
    base = projectPath(args),
    jsonMode = has(args, "json");
  if (action === "start") {
    const result = await request("workflow.start", {
      project: base,
      topic: value(args, "topic", true),
      audience: value(args, "audience", true),
      style: value(args, "style", true),
      imageProvider: value(args, "provider") || "flow",
      reset: has(args, "reset"),
    });
    output(result, jsonMode);
    return;
  }
  if (action === "status") {
    output(await request("workflow.status", { project: base }), jsonMode);
    return;
  }
  if (action === "artifact") {
    if (sub !== "idea" && sub !== "layout" && sub !== "script")
      throw new Error(
        "Usage: windi workflow artifact idea|layout|script --file PATH",
      );
    output(
      await request("workflow.artifact", {
        project: base,
        kind: sub,
        file: path.resolve(base, value(args, "file", true)!),
      }),
      jsonMode,
    );
    return;
  }
  if (action === "layout" && sub === "choose") {
    const preset = args.positionals[3];
    if (preset !== "paper-editorial" && preset !== "dark-cinematic")
      throw new Error(
        "Usage: windi workflow layout choose paper-editorial|dark-cinematic",
      );
    output(
      await request("workflow.layout.choose", { project: base, preset }),
      jsonMode,
    );
    return;
  }
  if (action === "approve") {
    if (sub !== "idea" && sub !== "layout" && sub !== "script")
      throw new Error(
        "Usage: windi workflow approve idea IDEA_ID | layout VERSION | script VERSION",
      );
    const approvalValue = args.positionals[3];
    if (!approvalValue) throw new Error("APPROVAL_VALUE_REQUIRED");
    output(
      await request("workflow.approve", {
        project: base,
        kind: sub,
        value: approvalValue,
      }),
      jsonMode,
    );
    return;
  }
  if (action === "run") {
    output(await runPipeline(base,value(args,"voice"),request,value(args,"audio-plan")),jsonMode);
    return;
  }
  if (action === "continue") {
    output(await request("workflow.continue", { project: base }), jsonMode);
    return;
  }
  throw new Error(
    "Usage: windi workflow start|status|layout|artifact|approve|continue",
  );
}
async function login(args: Parsed) {
  let secret = value(args, "token") || process.env.WINDI_WORKFLOW_TOKEN || process.env.WINDI_VOICE_TOKEN;
  if (!secret) {
    if (!process.stdin.isTTY) throw new Error("VOICE_TOKEN_REQUIRED");
    const io = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    secret = (
      await io.question(
        "Dán mã kết nối tài khoản Windi (lưu trong macOS Keychain): ",
      )
    ).trim();
    io.close();
  }
  output(secret.startsWith("windi_kit_") ? await activateLicense(secret, false, value(args, "api-url")) : await loginVoice(secret, value(args, "api-url")), has(args, "json"));
}
async function license(args: Parsed) {
  const action = args.positionals[1],
    jsonMode = has(args, "json");
  if (action === "status") {
    output(await licenseStatus(), jsonMode);
    return;
  }
  if (action !== "activate")
    throw new Error(
      "Usage: windi license activate [--token TOKEN] [--replace] [--api-url URL] | status",
    );
  let secret = value(args, "token") || process.env.WINDI_WORKFLOW_TOKEN;
  if (!secret) {
    if (!process.stdin.isTTY) throw new Error("WORKFLOW_TOKEN_REQUIRED");
    const io = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    secret = (
      await io.question(
        "Dán token Windi Workflow (chỉ lưu trong macOS Keychain): ",
      )
    ).trim();
    io.close();
  }
  output(
    await activateLicense(secret, has(args, "replace"), value(args, "api-url")),
    jsonMode,
  );
}
async function voice(args: Parsed) {
  const action = args.positionals[1],
    jsonMode = has(args, "json");
  if (action === "list") {
    const voices = await listWorkflowVoices();
    if (jsonMode) output(voices, true);
    else {
      for (const item of voices)
        console.log(
          `${item.id}  ${item.name}  ${item.language || "-"}  ${item.kind || "public"}`,
        );
    }
    return;
  }
  const base = projectPath(args);
  if (action === "import") {
    const audio = path.resolve(base, value(args, "audio", true)!);
    const captions = value(args, "captions")
      ? path.resolve(base, value(args, "captions")!)
      : await transcribeLocal(base, audio);
    output(
      await request("workflow.voice.import", {
        project: base,
        audio,
        captions,
      }),
      jsonMode,
    );
    return;
  }
  if (action === "generate") {
    const generated = await generateWorkflowVoice(
      base,
      value(args, "voice"),
      Number(value(args, "speed") || 1),
    );
    await request("workflow.voice.import", {
      project: base,
      audio: generated.audio,
      captions: generated.captions,
    });
    output(generated, jsonMode);
    return;
  }
  throw new Error(
    "Usage: windi voice list | import --audio FILE [--captions FILE] | generate --voice VOICE_ID",
  );
}
async function video(args: Parsed) {
  const action = args.positionals[1],
    base = projectPath(args),
    jsonMode = has(args, "json");
  if (action === "preview") {
    await previewVideo(base);
    return;
  }
  if (action === "render") {
    output(await renderVideo(base), jsonMode);
    return;
  }
  throw new Error("Usage: windi video preview | render");
}
async function tiktok(args:Parsed){
  const action=args.positionals[1],base=projectPath(args),jsonMode=has(args,'json');
  if(action==='prepare')return output(await prepareTikTokPost(base,value(args,'caption',true)!,value(args,'account',true)!),jsonMode);
  if(action==='approve')return output(await approveTikTokPost(base,value(args,'code',true)!),jsonMode);
  if(action==='status')return output(await tikTokPostStatus(base,value(args,'code',true)!),jsonMode);
  if(action==='session')return output(await checkTikTokSession(path.resolve(value(args,'cookie-file',true)!),value(args,'account')),jsonMode);
  if(action==='publish')return output(await publishTikTokPost(base,value(args,'code',true)!,path.resolve(value(args,'cookie-file',true)!)),jsonMode);
  throw new Error('Usage: windi tiktok prepare --account HANDLE --caption TEXT | approve|status --code CODE | session --cookie-file FILE [--account HANDLE] | publish --code CODE --cookie-file FILE');
}
async function facebook(args:Parsed){
  const action=args.positionals[1],base=projectPath(args),jsonMode=has(args,'json'),version=value(args,'api-version')||'v26.0';
  if(action==='page')return output(await checkFacebookPage(path.resolve(value(args,'token-file',true)!),value(args,'page-id',true)!,version),jsonMode);
  if(action==='prepare')return output(await prepareFacebookReel(base,value(args,'caption',true)!,value(args,'page-id',true)!,has(args,'public')?'PUBLISHED':'DRAFT'),jsonMode);
  if(action==='approve')return output(await approveFacebookReel(base,value(args,'code',true)!),jsonMode);
  if(action==='status')return output(has(args,'token-file')?await refreshFacebookReel(base,value(args,'code',true)!,path.resolve(value(args,'token-file',true)!),version):await facebookReelStatus(base,value(args,'code',true)!),jsonMode);
  if(action==='submit')return output(await submitFacebookReel(base,value(args,'code',true)!,path.resolve(value(args,'token-file',true)!),version),jsonMode);
  throw new Error('Usage: windi facebook page --page-id ID --token-file FILE | prepare --page-id ID --caption TEXT [--public] | approve|status --code CODE | submit --code CODE --token-file FILE');
}
async function postiz(args:Parsed){
  const action=args.positionals[1],base=projectPath(args),jsonMode=has(args,'json');
  if(action==='channels')return output(await listPostizChannels(value(args,'api-url',true)!,path.resolve(value(args,'key-file',true)!)),jsonMode);
  if(action==='prepare')return output(await preparePostizPost(base,value(args,'caption',true)!,value(args,'integration-id',true)!,value(args,'api-url',true)!,path.resolve(value(args,'key-file',true)!),has(args,'public')?'PUBLIC_TO_EVERYONE':undefined),jsonMode);
  if(action==='approve')return output(await approvePostizPost(base,value(args,'code',true)!),jsonMode);
  if(action==='status')return output(has(args,'key-file')?await inspectPostizPost(base,value(args,'code',true)!,path.resolve(value(args,'key-file',true)!)):await postizPostStatus(base,value(args,'code',true)!),jsonMode);
  if(action==='submit')return output(await submitPostizPost(base,value(args,'code',true)!,path.resolve(value(args,'key-file',true)!)),jsonMode);
  throw new Error('Usage: windi postiz channels --api-url URL --key-file FILE | prepare --api-url URL --key-file FILE --integration-id ID --caption TEXT [--public] | approve|status --code CODE | submit --code CODE --key-file FILE');
}
function help() {
  console.log('Postiz: windi postiz channels --api-url URL --key-file FILE | prepare --integration-id ID --caption TEXT --api-url URL --key-file FILE [--public] | approve|status --code CODE | submit --code CODE --key-file FILE');
  console.log(
    `Windi Video Workflow\n\n  windi grok login|logout|status|doctor\n  windi images create|edit --provider grok --prompt-file FILE --ref IMAGE --output PATH [--aspect 9:16 --resolution 1k --wait]\n  windi videos create --provider grok --prompt-file FILE --output PATH [--duration 6 --resolution 720p --wait]\n  Grok: @image1, @image2… theo thứ tự --input (nếu có), rồi --ref. Grok Web: ảnh tối đa 8 ref; video tối đa 2 ref; 1 ref dùng tỉ lệ ảnh gốc (--aspect auto), 2 ref chọn được tỉ lệ.\n\n  windi setup\n  windi license status\n  windi doctor [--json]\n  windi project init [--project PATH] [--relink|--fork]\n  windi project link --provider flow|chatgpt --url URL\n  windi workflow start --topic "..." --audience "..." --style "..." [--provider flow|chatgpt|grok]\n  windi workflow status\n  windi workflow artifact idea|layout|script --file PATH\n  windi workflow approve idea IDEA_ID\n  windi workflow layout choose paper-editorial|dark-cinematic\n  windi workflow approve layout LAYOUT_VERSION\n  windi workflow approve script SCRIPT_VERSION\n  windi workflow continue\n  windi images create --provider flow --prompt-file prompt.txt --aspect 16:9 --model standard --ref character.png --count 1 --output assets/windi/scene-01 [--wait]\n  Flow: tỷ lệ 9:16|16:9|1:1|3:4|4:3; model standard|pro|lite; count 1–4; tối đa 4 ảnh gồm input và ref.\n  windi images edit --provider chatgpt --input assets/windi/scene-01.png --prompt-file revision.txt --output assets/windi/scene-01-v02\n  windi images batch --manifest images.json\n  windi images clean [--project PATH]\n  windi jobs status JOB_ID | resume JOB_ID [--confirm-result|--confirm-no-result]\n  windi jobs import JOB_ID --file FILE [--replace]\n  windi voice list\n  windi voice import --audio voice.mp3 [--captions captions.json]\n  windi voice generate --voice VOICE_ID [--speed 1]\n  windi video preview | render\n  windi tiktok prepare --account HANDLE --caption TEXT\n  windi tiktok approve|status --code CODE\n  windi tiktok session --cookie-file FILE [--account HANDLE]\n  windi tiktok publish --code CODE --cookie-file FILE\n  windi facebook page --page-id ID --token-file FILE\n  windi facebook prepare --page-id ID --caption TEXT [--public]\n  windi facebook approve|status --code CODE\n  windi facebook submit --code CODE --token-file FILE\n\nSau khi duyệt idea, chọn một layout có sẵn hoặc dùng skill watch từ bradautomates/claude-video để phân tích video mẫu, ghi layout JSON rồi duyệt layout. Các lệnh project hỗ trợ --project; tác vụ máy hỗ trợ --json và request-key khi tạo tài nguyên.`,
  );
}
const args = parse(process.argv.slice(2));
try {
  const first = args.positionals[0];
  if (first === "mcp" && args.positionals[1] === "serve") {
    await import("./mcp.ts");
  } else if (first === "setup") {
    const prepared = await prepareWhisper();
    output(
      {
        ready: true,
        whisper: prepared,
        videoAnalyzer: await videoAnalyzerStatus(),
        accessMode: "local",
        doctor: await request("doctor"),
      },
      has(args, "json"),
    );
  } else if (first === "license") await license(args);
  else if (first === "login") await login(args);
  else if (first === "doctor")
    output(
      {
        license: await licenseStatus(),
        environment: await environmentStatus(),
        videoAnalyzer: await videoAnalyzerStatus(),
        connect: await request("doctor"),
      },
      has(args, "json"),
    );
  else {
    if (first === "init") await init(args);
    else if (first === "project") await project(args);
    else if (first === "workflow") await workflow(args);
    else if (first === "grok") await grok(args);
    else if (first === "videos") await videos(args);
    else if (first === "images") await images(args);
    else if (first === "jobs") await jobs(args);
    else if (first === "voice") await voice(args);
    else if (first === "video") await video(args);
    else if (first === "tiktok") await tiktok(args);
    else if (first === "facebook") await facebook(args);
    else if (first === "postiz") await postiz(args);
    else help();
  }
} catch (error) {
  const value = error instanceof Error ? error.message : String(error);
  const helpText =
    value === "PROJECT_NOT_INITIALIZED"
      ? "Chưa có Windi project ở folder này. Chạy `windi project init` trước."
      : value === "EXTENSION_DISCONNECTED"
        ? "Extension provider chưa kết nối. Mở popup Windi Connect trong browser đã chọn rồi bấm Kết nối lại."
        : value;
  console.error(JSON.stringify({ error: helpText }));
  process.exitCode = 1;
}
