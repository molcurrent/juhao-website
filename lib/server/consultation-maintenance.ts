import {
  claimConsultationNotification,
  completeConsultationNotification,
  purgeExpiredConsultationLeads,
  purgeExpiredConsultationRateLimits,
} from "@/db/consultation-leads";
import { purgeExpiredAnalyticsDailyCounts } from "@/db/analytics";
import {
  failedNotificationUpdate,
  leadNotificationConfig,
  notifyInternalLead,
  validateLeadNotificationConfig,
} from "@/lib/server/lead-notifications";

type MaintenanceEnv = Pick<Cloudflare.Env, "JUHAO_LEAD_WEBHOOK_URL" | "JUHAO_LEAD_WEBHOOK_SECRET"> & {
  DB?: D1Database;
};

const PURGE_BATCH_SIZE = 100;
const MAX_PURGE_BATCHES = 10;

async function purgeInBatches(
  purge: (db: D1Database, now: string, limit: number) => Promise<number>,
  database: D1Database,
  now: string,
) {
  let total = 0;
  for (let batch = 0; batch < MAX_PURGE_BATCHES; batch += 1) {
    const removed = await purge(database, now, PURGE_BATCH_SIZE);
    total += removed;
    if (removed < PURGE_BATCH_SIZE) break;
  }
  return total;
}

export async function runConsultationMaintenance(runtime: MaintenanceEnv) {
  if (!runtime.DB) throw new Error("consultation_database_unavailable");
  const now = new Date();
  const nowIso = now.toISOString();
  const purged = await purgeInBatches(purgeExpiredConsultationLeads, runtime.DB, nowIso);
  const rateLimitsPurged = await purgeInBatches(purgeExpiredConsultationRateLimits, runtime.DB, nowIso);
  const analyticsPurged = await purgeInBatches(purgeExpiredAnalyticsDailyCounts, runtime.DB, nowIso);
  const config = leadNotificationConfig(runtime);
  if (!config.webhookUrl) {
    return { purged, rateLimitsPurged, analyticsPurged, attempted: 0, sent: 0, retry: 0, deadLetter: 0, stale: 0, notification: "not_configured" as const };
  }
  validateLeadNotificationConfig(config);

  let sent = 0;
  let retry = 0;
  let deadLetter = 0;
  let stale = 0;
  let attempted = 0;
  for (let index = 0; index < 25; index += 1) {
    const attemptedAt = new Date();
    const lead = await claimConsultationNotification(runtime.DB, attemptedAt);
    if (!lead) break;
    attempted += 1;
    try {
      await notifyInternalLead(lead, config);
      if (await completeConsultationNotification(runtime.DB, lead, {
        status: "sent",
        error: null,
        nextAttemptAt: null,
      })) sent += 1;
      else stale += 1;
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 120) : "webhook_failed";
      const failure = failedNotificationUpdate(lead.notificationAttempts, attemptedAt);
      const completed = await completeConsultationNotification(runtime.DB, lead, {
        status: failure.status,
        error: detail,
        nextAttemptAt: failure.nextAttemptAt,
      });
      if (!completed) {
        stale += 1;
        continue;
      }
      if (failure.status === "dead_letter") deadLetter += 1;
      else retry += 1;
    }
  }
  return { purged, rateLimitsPurged, analyticsPurged, attempted, sent, retry, deadLetter, stale, notification: "processed" as const };
}
