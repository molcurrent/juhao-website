import { env } from "cloudflare:workers";
import {
  listRetryableConsultationLeads,
  purgeExpiredConsultationLeads,
  updateConsultationNotification,
} from "@/db/consultation-leads";
import {
  failedNotificationUpdate,
  leadNotificationConfig,
  notifyInternalLead,
  validateLeadNotificationConfig,
} from "@/lib/server/lead-notifications";

function json(data: unknown, status: number) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function tokenMatches(candidate: string, expected: string) {
  const encode = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [candidateHash, expectedHash] = await Promise.all([encode(candidate), encode(expected)]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function POST(request: Request) {
  const maintenanceSecret = env.JUHAO_LEAD_MAINTENANCE_SECRET?.trim();
  if (!maintenanceSecret) return json({ error: "线索维护任务尚未配置" }, 503);
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token || !await tokenMatches(token, maintenanceSecret)) return json({ error: "未授权" }, 401);
  if (!env.DB) return json({ error: "咨询服务暂时不可用" }, 503);

  const now = new Date();
  const nowIso = now.toISOString();
  const purged = await purgeExpiredConsultationLeads(env.DB, nowIso);
  const config = leadNotificationConfig(env);
  if (!config.webhookUrl) return json({ purged, attempted: 0, sent: 0, retry: 0, deadLetter: 0, notification: "not_configured" }, 200);
  try {
    validateLeadNotificationConfig(config);
  } catch {
    return json({ error: "内部通知配置不完整", purged }, 503);
  }

  const leads = await listRetryableConsultationLeads(env.DB, nowIso);
  let sent = 0;
  let retry = 0;
  let deadLetter = 0;

  for (const lead of leads) {
    const attemptedAt = new Date();
    try {
      await notifyInternalLead(lead, config);
      await updateConsultationNotification(env.DB, lead.id, {
        status: "sent",
        error: null,
        attemptedAt: attemptedAt.toISOString(),
        nextAttemptAt: null,
      });
      sent += 1;
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 120) : "webhook_failed";
      const failure = failedNotificationUpdate(lead.notificationAttempts + 1, attemptedAt);
      await updateConsultationNotification(env.DB, lead.id, {
        status: failure.status,
        error: detail,
        attemptedAt: attemptedAt.toISOString(),
        nextAttemptAt: failure.nextAttemptAt,
      });
      if (failure.status === "dead_letter") deadLetter += 1;
      else retry += 1;
    }
  }

  return json({ purged, attempted: leads.length, sent, retry, deadLetter, notification: "processed" }, 200);
}
