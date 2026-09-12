import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const bridgeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const waitForHealth = async (url) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Bridge did not start");
};

test("bridge validates destinations and atomically saves a generated image", async (context) => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "chatgpt-image-bridge-test-"));
  const projectRoot = path.join(sandbox, "project");
  const cliPath = path.join(sandbox, "fake-imagegen.mjs");
  await mkdir(path.join(projectRoot, "public/references/ep099"), { recursive: true });
  await writeFile(path.join(projectRoot, "public/references/ep099/ref.png"), Buffer.from(png, "base64"));
  await writeFile(path.join(projectRoot, "public/references/ep099/ref-2.png"), Buffer.from(png, "base64"));
  await writeFile(cliPath, `import { writeFile } from 'node:fs/promises';\nconst out = process.argv[process.argv.indexOf('--out') + 1];\nawait writeFile(out, Buffer.from('${png}', 'base64'));\n`);
  await chmod(cliPath, 0o755);

  const port = 42000 + (process.pid % 1000);
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(bridgeRoot, "server.mjs")], {
    env: { ...process.env, CHATGPT_IMAGE_PROJECT_ROOT: projectRoot, CHATGPT_IMAGEGEN_CLI: cliPath, CHATGPT_IMAGEGEN_PYTHON: process.execPath, CHATGPT_IMAGE_BRIDGE_PORT: String(port) },
    stdio: "ignore",
  });
  context.after(() => child.kill("SIGTERM"));
  await waitForHealth(url);

  const health = await fetch(`${url}/health`).then((response) => response.json());
  assert.equal(health.cliAvailable, true);
  assert.equal(health.pythonAvailable, true);

  const generated = await fetch(`${url}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "safe test image", targetPath: "public/illustrations/ep099/sheet.png", referencePaths: ["public/references/ep099/ref.png", "public/references/ep099/ref-2.png"] }),
  });
  assert.equal(generated.status, 201);
  const generatedPayload = await generated.json();
  assert.equal(generatedPayload.format, "png");
  assert.equal(generatedPayload.backend, "web");
  assert.deepEqual(generatedPayload.referencePaths, ["public/references/ep099/ref.png", "public/references/ep099/ref-2.png"]);
  assert.deepEqual(await readFile(path.join(projectRoot, "public/illustrations/ep099/sheet.png")), Buffer.from(png, "base64"));

  const duplicate = await fetch(`${url}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "same", targetPath: "public/illustrations/ep099/sheet.png" }),
  });
  assert.equal(duplicate.status, 409);

  const escaped = await fetch(`${url}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "bad", targetPath: "../escape.png" }),
  });
  assert.equal(escaped.status, 400);
});
