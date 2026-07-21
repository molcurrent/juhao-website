import {
  listRetryableConsultationLeads,
  purgeExpiredConsultationLeads,
  purgeExpiredConsultationRateLimits,
  updateConsultationNotification,
} from "@/db/consultation-leads";
import {
  failedNotificationUpdate,
  leadNotificationConfig,
  notifyInternalLead,
  validateLeadNotificationConfig,
} from "@/lib/server/lead-notifications";

type MaintenanceEnv = Pick<Cloudflare.Env, "JUHAO_LEAD_WEBHOOK_URL" | "JUHAO_LEAD_WEBHOOK_SECRET"> & {
  DB?: D1Database;
};

export async function runConsultationMaintenance(runtime: MaintenanceEnv) {
  if (!runtime.DB) throw new Error("consultation_database_unavailable");
  const now = new Date();
  const nowIso = now.toISOString();
  const purged = await purgeExpiredConsultationLeads(runtime.DB, nowIso);
  const rateLimitsPurged = await purgeExpiredConsultationRateLimits(runtime.DB, nowIso);
  const config = leadNotificationConfig(runtime);
  if (!config.webhookUrl) {
    return { purged, rateLimitsPurged, attempted: 0, sent: 0, retry: 0, deadLetter: 0, notification: "not_configured" as const };
  }
  validateLeadNotificationConfig(config);

  const leads = await listRetryableConsultationLeads(runtime.DB, nowIso);
  let sent = 0;
  let retry = 0;
  let deadLetter = 0;
  for (const lead of leads) {
    const attemptedAt = new Date();
    try {
      await notifyInternalLead(lead, config);
      await updateConsultationNotification(runtime.DB, lead.id, {
        status: "sent",
        error: null,
        attemptedAt: attemptedAt.toISOString(),
        nextAttemptAt: null,
      });
      sent += 1;
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 120) : "webhook_failed";
      const failure = failedNotificationUpdate(lead.notificationAttempts + 1, attemptedAt);
      await updateConsultationNotification(runtime.DB, lead.id, {
        status: failure.status,
        error: detail,
        attemptedAt: attemptedAt.toISOString(),
        nextAttemptAt: failure.nextAttemptAt,
      });
      if (failure.status === "dead_letter") deadLetter += 1;
      else retry += 1;
    }
  }
  return { purged, rateLimitsPurged, attempted: leads.length, sent, retry, deadLetter, notification: "processed" as const };
}
