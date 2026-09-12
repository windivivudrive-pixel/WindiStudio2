import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { home } from "./protocol.ts";

const run = promisify(execFile);
const service = "com.windistudio.video-workflow";
const account = "Windi Video Workflow";
const configPath = path.join(home, "client.json");
const defaultApi = "https://windistudio.app";

async function config() {
  try {
    return JSON.parse(await readFile(configPath, "utf8")) as {
      apiUrl?: string;
    };
  } catch {
    return {};
  }
}

async function apiUrl() {
  return (await config()).apiUrl || process.env.WINDI_API_URL || defaultApi;
}

async function saveApiUrl(value: string) {
  await mkdir(home, { recursive: true, mode: 0o700 });
  await writeFile(
    configPath,
    `${JSON.stringify({ ...(await config()), apiUrl: value }, null, 2)}\n`,
    { mode: 0o600 },
  );
}

export async function workflowDeviceId() {
  try {
    const { stdout } = await run("/usr/sbin/ioreg", [
      "-rd1",
      "-c",
      "IOPlatformExpertDevice",
    ]);
    const found = stdout.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/i)?.[1];
    if (found) return found;
  } catch {}
  return `${os.hostname()}-${os.arch()}-${os.platform()}`;
}

export async function workflowToken() {
  try {
    return (
      await run("/usr/bin/security", [
        "find-generic-password",
        "-a",
        account,
        "-s",
        service,
        "-w",
      ])
    ).stdout.trim();
  } catch {
    throw new Error("LOGIN_REQUIRED: chạy `windi login` để kết nối tài khoản trước.");
  }
}

async function request(
  endpoint: string,
  secret: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${await apiUrl()}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    [key: string]: unknown;
  };
  if (!response.ok)
    throw new Error(body.error || `LICENSE_API_${response.status}`);
  return body;
}

export async function activateLicense(
  secret: string,
  replace = false,
  requestedApiUrl?: string,
) {
  if (!/^windi_kit_[A-Za-z0-9_-]{32,}$/.test(secret))
    throw new Error("INVALID_WINDI_WORKFLOW_TOKEN");
  if (requestedApiUrl) await saveApiUrl(requestedApiUrl.replace(/\/$/, ""));
  const result = await request("/api/video-kits/access", secret);
  await run("/usr/bin/security", [
    "add-generic-password",
    "-U",
    "-a",
    account,
    "-s",
    service,
    "-w",
    secret,
  ]);
  return result;
}

export async function verifyLicense() {
  const secret = await workflowToken();
  return request("/api/video-kits/access", secret);
}

export async function licenseStatus() {
  try {
    return { connected: true, ...(await verifyLicense()) };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
