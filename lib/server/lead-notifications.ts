import type { ConsultationLeadRecord, ConsultationNotificationStatus } from "@/db/consultation-leads";

const MAX_NOTIFICATION_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 12 * 60 * 60_000] as const;

export type LeadNotificationConfig = {
  webhookUrl: string | null;
  webhookSecret: string | null;
};

export function leadNotificationConfig(runtime: Pick<Cloudflare.Env, "JUHAO_LEAD_WEBHOOK_URL" | "JUHAO_LEAD_WEBHOOK_SECRET">): LeadNotificationConfig {
  return {
    webhookUrl: runtime.JUHAO_LEAD_WEBHOOK_URL?.trim() || null,
    webhookSecret: runtime.JUHAO_LEAD_WEBHOOK_SECRET?.trim() || null,
  };
}

export function validateLeadNotificationConfig(config: LeadNotificationConfig) {
  if (!config.webhookUrl) return;
  if (!config.webhookSecret) throw new Error("webhook_secret_missing");
  const url = new URL(config.webhookUrl);
  if (url.protocol !== "https:") throw new Error("webhook_url_invalid");
}

async function webhookSignature(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function notifyInternalLead(lead: ConsultationLeadRecord, config: LeadNotificationConfig) {
  validateLeadNotificationConfig(config);
  if (!config.webhookUrl || !config.webhookSecret) throw new Error("webhook_not_configured");
  const body = JSON.stringify({
    id: lead.id,
    submittedAt: lead.createdAt,
    direction: lead.direction,
    source: lead.source,
    sourceDetail: lead.sourceDetail,
    scene: lead.scene,
    intent: lead.intent,
    project: lead.project,
    stage: lead.stage,
    need: lead.need,
    contactName: lead.contactName,
    contactChannel: lead.contactChannel,
    contactValue: lead.contactValue,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": lead.id,
        "X-Juhao-Signature": `sha256=${await webhookSignature(config.webhookSecret, body)}`,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`webhook_http_${response.status}`);
  } finally {
    clearTimeout(timeout);
  }
}

export function failedNotificationUpdate(attemptsAfterUpdate: number, attemptedAt: Date) {
  const exhausted = attemptsAfterUpdate >= MAX_NOTIFICATION_ATTEMPTS;
  const status: ConsultationNotificationStatus = exhausted ? "dead_letter" : "retry";
  const retryDelay = RETRY_DELAYS_MS[Math.min(Math.max(attemptsAfterUpdate - 1, 0), RETRY_DELAYS_MS.length - 1)];
  return {
    status: status as "retry" | "dead_letter",
    nextAttemptAt: exhausted ? null : new Date(attemptedAt.getTime() + retryDelay).toISOString(),
  };
}
