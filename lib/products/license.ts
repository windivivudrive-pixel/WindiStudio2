import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { VoiceError, writer } from "@/lib/voice/server";

const TOKEN_PREFIX = "windi_kit_";

export function hashProductToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createProductToken() {
  const secret = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    secret,
    hash: hashProductToken(secret),
    prefix: secret.slice(0, TOKEN_PREFIX.length + 8),
    lastFour: secret.slice(-4),
  };
}

function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function productTokenIdentity(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(windi_kit_[A-Za-z0-9_-]+)$/);
  if (!match)
    throw new VoiceError(
      "Token Windi Workflow bị thiếu hoặc không hợp lệ.",
      401,
    );
  const secret = match[1];
  const hash = hashProductToken(secret);
  const db = writer();
  const { data, error } = await db
    .from("automation_tokens")
    .select("id,user_id,token_hash")
    .eq("token_prefix", secret.slice(0, TOKEN_PREFIX.length + 8))
    .eq("purpose", "video_workflow")
    .is("revoked_at", null)
    .limit(10);
  if (error) throw error;
  const token = data?.find((item) => hashesMatch(item.token_hash, hash));
  if (!token)
    throw new VoiceError(
      "Token Windi Workflow không hợp lệ hoặc đã bị thu hồi.",
      401,
    );
  const { data: entitlement, error: entitlementError } = await db
    .from("product_entitlements")
    .select("id")
    .eq("user_id", token.user_id)
    .eq("kind", "video_workflow_v1")
    .eq("status", "active")
    .maybeSingle();
  if (entitlementError) throw entitlementError;
  if (!entitlement)
    throw new VoiceError(
      "Giấy phép Windi Video Workflow không còn hoạt động.",
      403,
    );
  const { error: touchError } = await db
    .from("automation_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", token.id);
  if (touchError) throw touchError;
  return {
    userId: token.user_id as string,
    tokenId: token.id as string,
    entitlementId: entitlement.id as string,
  };
}
