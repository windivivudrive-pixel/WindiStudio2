import "server-only";

import { writer } from "./server";

export const VOICE_HISTORY_RETENTION_DAYS = 7;
const cleanupBatchSize = 250;

type ExpiredVoiceJob = {
  id: string;
  user_id: string;
  status: string;
  storage_path: string | null;
  timing_path: string | null;
};

const cutoffDate = () =>
  new Date(Date.now() - VOICE_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

function ownedPath(
  job: ExpiredVoiceJob,
  path: string | null,
  extension: ".mp3" | ".json",
) {
  return path === `${job.user_id}/${job.id}${extension}` ? path : null;
}

/**
 * Removes old user audio, timestamps and transcript records. Ledger rows remain
 * as credit/accounting evidence, with their job reference cleared first.
 */
export async function purgeExpiredVoiceHistory() {
  const db = writer();
  const cutoff = cutoffDate();
  const { data, error } = await db
    .from("windi_voice_jobs")
    .select("id,user_id,status,storage_path,timing_path")
    .lt("created_at", cutoff)
    .in("status", ["ready", "failed"])
    .order("created_at", { ascending: true })
    .limit(cleanupBatchSize);
  if (error) throw error;

  const jobs = (data ?? []) as ExpiredVoiceJob[];
  if (!jobs.length)
    return { cutoff, deletedJobs: 0, deletedAudio: 0, deletedTimestamps: 0 };

  const audioPaths = jobs
    .map((job) => ownedPath(job, job.storage_path, ".mp3"))
    .filter((path): path is string => !!path);
  const timingPaths = jobs
    .map((job) => ownedPath(job, job.timing_path, ".json"))
    .filter((path): path is string => !!path);

  if (audioPaths.length) {
    const { error: audioError } = await db.storage
      .from("windi-voice-audio")
      .remove(audioPaths);
    if (audioError) throw audioError;
  }
  if (timingPaths.length) {
    const { error: timingError } = await db.storage
      .from("windi-voice-timing")
      .remove(timingPaths);
    if (timingError) throw timingError;
  }

  const ids = jobs.map((job) => job.id);
  const { error: detachError } = await db
    .from("windi_voice_ledger")
    .update({ job_id: null })
    .in("job_id", ids);
  if (detachError) throw detachError;

  const { data: deleted, error: deleteError } = await db
    .from("windi_voice_jobs")
    .delete()
    .in("id", ids)
    .lt("created_at", cutoff)
    .select("id");
  if (deleteError) throw deleteError;

  return {
    cutoff,
    deletedJobs: deleted?.length ?? 0,
    deletedAudio: audioPaths.length,
    deletedTimestamps: timingPaths.length,
  };
}

export function voiceHistoryCutoff() {
  return cutoffDate();
}
