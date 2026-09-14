import { purgeExpiredVoiceHistory } from "@/lib/voice/retention";
import { failure } from "@/lib/voice/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return Response.json({ success: true, ...(await purgeExpiredVoiceHistory()) });
  } catch (error) {
    return failure(error);
  }
}
