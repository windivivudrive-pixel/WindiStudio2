import { createServer } from "node:http";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, rename, stat, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const workspaceRoot = path.resolve(toolRoot, "../..");
const projects = {
  "girl-compare": {
    root: path.resolve(process.env.CHATGPT_IMAGE_PROJECT_ROOT || path.join(workspaceRoot, "girl-compare-remotion")),
    chatProject: "girl-compare",
  },
  "manly-darklab": {
    root: path.resolve(path.join(workspaceRoot, "Manly-darklab")),
    chatProject: "manly-darklab",
  },
};
const cliPath = path.resolve(process.env.CHATGPT_IMAGEGEN_CLI || path.join(workspaceRoot, "tools/chatgpt-imagegen/chatgpt-imagegen"));
const pythonPath = path.resolve(process.env.CHATGPT_IMAGEGEN_PYTHON || path.join(workspaceRoot, "tools/flow-agent/flow-agent/.venv/bin/python"));
const port = Number(process.env.CHATGPT_IMAGE_BRIDGE_PORT || 38472);
const host = "127.0.0.1";
const version = "1.0.0";
const maxBodyBytes = 96 * 1024;
const maxPromptLength = 24_000;
const maxTimeoutSeconds = 600;
const localBinPath = path.join(homedir(), ".local/bin");
let activeJob = null;

const json = (response, status, payload) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const isInside = (parent, candidate) => {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const exists = async (candidate) => {
  try {
    await access(candidate, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const resolveProject = (value) => {
  const key = String(value || "girl-compare").trim().toLowerCase();
  const project = projects[key];
  if (!project) throw new Error("project must be girl-compare or manly-darklab");
  return {
    key,
    root: project.root,
    outputRoot: path.join(project.root, "public/illustrations"),
    referencesRoot: path.join(project.root, "public/references"),
    chatProject: project.chatProject,
  };
};

const normaliseTarget = (value, project) => {
  const normalized = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
  if (!/^public\/illustrations\/ep\d{3,}\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp)$/i.test(normalized)) {
    throw new Error("targetPath must match public/illustrations/epNNN/<safe-image-name>");
  }
  const destination = path.resolve(project.root, normalized);
  if (!isInside(project.outputRoot, destination)) throw new Error("targetPath escapes the illustration directory");
  return { normalized, destination };
};

const normaliseReference = async (value, project) => {
  const normalized = String(value).replaceAll("\\", "/").replace(/^\.\//, "");
  if (!/^public\/references\/ep\d{3,}\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp)$/i.test(normalized)) {
    throw new Error("referencePath must match public/references/epNNN/<safe-image-name>");
  }
  const source = path.resolve(project.root, normalized);
  if (!isInside(project.referencesRoot, source)) throw new Error("referencePath escapes the reference directory");
  await access(source, fsConstants.R_OK);
  const sourceStat = await stat(source);
  if (!sourceStat.isFile() || sourceStat.size > 30 * 1024 * 1024) {
    throw new Error("referencePath must be an image smaller than 30 MB");
  }
  return { normalized, source };
};

const normaliseReferences = async (body, project) => {
  const raw = body.referencePaths ?? (body.referencePath ? [body.referencePath] : []);
  if (!Array.isArray(raw) || raw.length > 4) throw new Error("referencePaths must contain at most four image paths");
  return Promise.all(raw.filter(Boolean).map((value) => normaliseReference(value, project)));
};

const formatForTarget = (destination) => {
  const extension = path.extname(destination).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  if (extension === ".webp") return "webp";
  return "png";
};

const sniffImage = async (candidate) => {
  const bytes = await import("node:fs/promises").then(({ open }) => open(candidate, "r"));
  try {
    const buffer = Buffer.alloc(16);
    await bytes.read(buffer, 0, buffer.length, 0);
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
    if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
    return "unknown";
  } finally {
    await bytes.close();
  }
};

const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      // The local Chrome connector installs here when /usr/local/bin is not writable.
      PATH: [localBinPath, process.env.PATH].filter(Boolean).join(":"),
      CHATGPT_IMAGEGEN_NO_UPDATE_CHECK: "1",
      ...options.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  const cap = 16 * 1024;
  const capture = (chunks) => (chunk) => {
    if (Buffer.concat(chunks).length < cap) chunks.push(Buffer.from(chunk).subarray(0, cap));
  };
  child.stdout.on("data", capture(stdout));
  child.stderr.on("data", capture(stderr));
  const timer = setTimeout(() => child.kill("SIGTERM"), options.timeoutMs || maxTimeoutSeconds * 1000);
  child.on("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on("close", (code, signal) => {
    clearTimeout(timer);
    resolve({ code, signal, stdout: Buffer.concat(stdout).toString("utf8").trim(), stderr: Buffer.concat(stderr).toString("utf8").trim() });
  });
});

const health = async () => ({
  ok: true,
  version,
  port,
  projectRoot: projects["girl-compare"].root,
  outputRoot: path.join(projects["girl-compare"].root, "public/illustrations"),
  supportedProjects: Object.keys(projects),
  cliAvailable: await exists(cliPath),
  pythonAvailable: await exists(pythonPath),
  busy: Boolean(activeJob),
  activeTargetPath: activeJob?.targetPath || null,
});

const generate = async (body) => {
  if (activeJob) {
    const error = new Error(`Another image job is already active for ${activeJob.targetPath}`);
    error.code = "EBUSY";
    throw error;
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > maxPromptLength) throw new Error(`prompt is required and must be at most ${maxPromptLength} characters`);
  const project = resolveProject(body.project);
  const { normalized: targetPath, destination } = normaliseTarget(body.targetPath, project);
  const references = await normaliseReferences(body, project);
  // ChatGPT web is the default on purpose: image quota belongs to the user's
  // ChatGPT subscription.  Never silently fall back to the metered Codex
  // route when the browser connector is unavailable.
  const backend = String(body.backend || "web").toLowerCase();
  if (!new Set(["auto", "web", "codex", "gemini", "agy"]).has(backend)) throw new Error("backend must be auto, web, codex, gemini, or agy");
  const size = String(body.size || "1024x1365").toLowerCase();
  if (!/^(?:auto|(?:[2-4]\d{2}|[1-3]\d{3}|4096)x(?:[2-4]\d{2}|[1-3]\d{3}|4096))$/.test(size)) {
    throw new Error("size must be auto or a widthxheight value from 200 to 4096");
  }
  const timeoutSeconds = Math.min(Math.max(Number(body.timeoutSeconds || 300), 30), maxTimeoutSeconds);
  const session = body.session == null ? null : String(body.session).trim();
  if (session && !/^[A-Za-z0-9_-]{1,80}$/.test(session)) throw new Error("session must contain only letters, numbers, underscores, or hyphens");
  const overwrite = body.overwrite === true;
  if (!await exists(cliPath)) throw new Error(`chatgpt-imagegen CLI is missing: ${cliPath}`);
  if (!await exists(pythonPath)) throw new Error(`Python 3.10+ runtime is missing: ${pythonPath}`);
  if (!overwrite && await exists(destination)) {
    const error = new Error(`Destination already exists: ${targetPath}`);
    error.code = "EEXIST";
    throw error;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const temporaryOutput = `${destination}.chatgpt-image-${process.pid}-${Date.now()}`;
  const args = [cliPath, prompt, "--out", temporaryOutput, "--size", size, "--format", formatForTarget(destination), "--backend", backend, "--quiet", "--no-progress", "--timeout", String(timeoutSeconds), "--project", project.chatProject];
  if (session) args.push("--session", session);
  for (const reference of references) args.push("--ref", reference.source);
  activeJob = { targetPath, startedAt: Date.now() };
  try {
    const result = await run(pythonPath, args, { timeoutMs: timeoutSeconds * 1000 + 15_000 });
    if (result.code !== 0) {
      throw new Error(`chatgpt-imagegen failed (${result.code ?? result.signal ?? "unknown"}): ${result.stderr || result.stdout || "no diagnostic output"}`);
    }
    const detected = await sniffImage(temporaryOutput);
    if (detected === "unknown") throw new Error("chatgpt-imagegen did not return a valid PNG, JPEG, or WebP image");
    if (overwrite) {
      try { await unlink(destination); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    await rename(temporaryOutput, destination);
    return { ok: true, project: project.key, targetPath, bytes: (await stat(destination)).size, format: detected, backend, referencePaths: references.map(({ normalized }) => normalized) };
  } finally {
    activeJob = null;
    try { await unlink(temporaryOutput); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
};

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") return json(response, 204, {});
    const url = new URL(request.url, `http://${host}:${port}`);
    if (request.method === "GET" && url.pathname === "/health") return json(response, 200, await health());
    if (request.method === "GET" && url.pathname === "/doctor") {
      if (!await exists(cliPath) || !await exists(pythonPath)) return json(response, 503, { ok: false, error: "CLI or Python runtime is missing", ...(await health()) });
      const result = await run(pythonPath, [cliPath, "doctor"], { timeoutMs: 30_000 });
      return json(response, result.code === 0 ? 200 : 503, { ok: result.code === 0, ...await health(), doctor: result.stdout, diagnostic: result.stderr || null });
    }
    if (request.method === "POST" && url.pathname === "/generate") {
      try {
        return json(response, 201, await generate(await readJsonBody(request)));
      } catch (error) {
        const status = error.code === "EEXIST" || error.code === "EBUSY" ? 409 : 400;
        return json(response, status, { ok: false, error: error.message });
      }
    }
    return json(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    return json(response, 500, { ok: false, error: error.message });
  }
});

server.listen(port, host, () => {
  process.stdout.write(`ChatGPT Image Bridge listening at http://${host}:${port}\n`);
  process.stdout.write(`Projects: ${Object.keys(projects).join(", ")}\n`);
});

export { generate, isInside, normaliseTarget };
