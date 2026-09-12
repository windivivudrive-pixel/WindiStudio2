#!/usr/bin/env node
import {cleanWorkflowImages} from './watermark.ts';
import {runPipeline} from './pipeline.ts';
import net from "node:net";
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
    if (await access(skill).then(() => true).catch(() => false))
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
    if (has(args, "wait")) await waitFor(result.job.id, jsonMode);
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
      for (const item of created) await waitFor(item.job.id, jsonMode);
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
    output(await request(`job.${action}`, { id, confirmNoResult: has(args, "confirm-no-result"), confirmResult: has(args,"confirm-result") }), jsonMode);
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
      value(args, "voice", true)!,
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
function help() {
  console.log(
    `Windi Video Workflow\n\n  windi setup\n  windi license status\n  windi doctor [--json]\n  windi project init [--project PATH] [--relink|--fork]\n  windi project link --provider flow|chatgpt --url URL\n  windi workflow start --topic "..." --audience "..." --style "..." [--provider flow|chatgpt]\n  windi workflow status\n  windi workflow artifact idea|layout|script --file PATH\n  windi workflow approve idea IDEA_ID\n  windi workflow layout choose paper-editorial|dark-cinematic\n  windi workflow approve layout LAYOUT_VERSION\n  windi workflow approve script SCRIPT_VERSION\n  windi workflow continue\n  windi images create --provider flow --prompt-file prompt.txt --ref character.png --output assets/windi/scene-01 [--wait]\n  windi images edit --provider chatgpt --input assets/windi/scene-01.png --prompt-file revision.txt --output assets/windi/scene-01-v02\n  windi images batch --manifest images.json\n  windi images clean [--project PATH]\n  windi jobs status JOB_ID | resume JOB_ID [--confirm-result|--confirm-no-result]\n  windi jobs import JOB_ID --file FILE [--replace]\n  windi voice list\n  windi voice import --audio voice.mp3 [--captions captions.json]\n  windi voice generate --voice VOICE_ID [--speed 1]\n  windi video preview | render\n\nSau khi duyệt idea, chọn một layout có sẵn hoặc dùng skill watch từ bradautomates/claude-video để phân tích video mẫu, ghi layout JSON rồi duyệt layout. Các lệnh project hỗ trợ --project; tác vụ máy hỗ trợ --json và request-key khi tạo tài nguyên.`,
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
        videoAnalyzer: await videoAnalyzerStatus(),
        connect: await request("doctor"),
      },
      has(args, "json"),
    );
  else {
    if (first === "init") await init(args);
    else if (first === "project") await project(args);
    else if (first === "workflow") await workflow(args);
    else if (first === "images") await images(args);
    else if (first === "jobs") await jobs(args);
    else if (first === "voice") await voice(args);
    else if (first === "video") await video(args);
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
