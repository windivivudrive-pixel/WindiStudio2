import { homedir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { StringDecoder } from "node:string_decoder";

/** The local protocol is deliberately private to one macOS account. */
export const VERSION = 2;
export const providers = ["flow", "chatgpt"] as const;
export type Provider = (typeof providers)[number];
export const home = path.resolve(
  process.env.WINDI_HOME ||
    path.join(homedir(), "Library/Application Support/WindiConnect"),
);
// macOS Unix socket paths have a small length limit. The owner-only directory
// prevents another account from replacing our socket, even with a short path.
export const runtime = path.join(
  "/tmp",
  `windi-${process.getuid?.() ?? "user"}-${createHash("sha256").update(home).digest("hex").slice(0, 10)}`,
);
export const socketPath = path.join(runtime, "connect.sock");
export const databasePath = path.join(home, "state.sqlite");
export const stagingRoot = path.join(home, "staging");
export const providerUrl = (provider: Provider) =>
  provider === "flow" ? "https://flow.google.com/" : "https://chatgpt.com/";
export function validProvider(value: unknown): Provider {
  if (!providers.includes(value as Provider))
    throw new Error("INVALID_PROVIDER");
  return value as Provider;
}
export function allowedUrl(provider: Provider, value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      (provider === "chatgpt"
        ? u.hostname === "chatgpt.com"
        : u.hostname === "flow.google.com" ||
          (u.hostname === "labs.google" &&
            /^\/fx\/(?:[^/]+\/)?tools\/flow(?:\/|$)/.test(u.pathname)))
    );
  } catch {
    return false;
  }
}

export const jobStatuses = [
  "queued",
  "preparing",
  "submitted",
  "generating",
  "downloading",
  "complete",
  "needs_user_action",
  "unknown_result",
  "failed",
  "cancelled",
] as const;
export type JobStatus = (typeof jobStatuses)[number];
export type JobKind = "create" | "edit";
export function isTerminal(status: JobStatus) {
  return ["complete", "failed", "cancelled"].includes(status);
}
export function now() {
  return new Date().toISOString();
}
export function json(value: unknown) {
  return JSON.stringify(value);
}
export function readJson<T>(value: string | undefined | null, fallback: T): T {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Keep error strings stable: CLI, popup and agents can offer a useful remedy. */
export const userActionErrors = new Set([
  "EXTENSION_DISCONNECTED",
  "BRIDGE_TIMEOUT_RESULT_UNKNOWN",
  "PROVIDER_UI_CHANGED",
  "PROVIDER_LOGIN_REQUIRED",
  "PROVIDER_CAPTCHA_REQUIRED",
  "PROVIDER_QUOTA_OR_ERROR",
  "DOWNLOAD_NOT_OBSERVED",
  "DOWNLOAD_RESULT_UNCLEAR",
  "DUPLICATE_ASSET_MISMATCH",
  "RESULT_NEEDS_RECONCILIATION",
  "TAB_NOT_OWNED_OR_WRONG_PROVIDER",
  "FLOW_DIRECT_HTTP_400",
  "FLOW_DIRECT_HTTP_401",
  "FLOW_DIRECT_HTTP_403",
  "FLOW_DIRECT_HTTP_409",
  "FLOW_DIRECT_HTTP_429",
  "FLOW_DIRECT_SESSION_NOT_READY",
  "FLOW_DIRECT_CAPTCHA_UNAVAILABLE",
  "FLOW_DIRECT_INPUT_UNSUPPORTED",
  "FLOW_WORKSPACE_REQUIRED",
]);
export function parseLines(
  onMessage: (message: any) => void,
  max = 1024 * 1024,
) {
  let buffer = "";
  const decoder = new StringDecoder("utf8");
  return (chunk: Buffer | string) => {
    buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
    if (Buffer.byteLength(buffer) > max) throw new Error("MESSAGE_TOO_LARGE");
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line) onMessage(JSON.parse(line));
    }
  };
}
