import { env } from "cloudflare:workers";
import {
  insertConsultationLead,
  purgeExpiredConsultationLeads,
  updateConsultationNotification,
  type ConsultationLeadRecord,
} from "@/db/consultation-leads";
import type { ContactRequest } from "@/lib/api/types";
import {
  CONSULTATION_PRIVACY_VERSION,
  consultationSourceValues,
  type ConsultationSource,
} from "@/lib/consultation";
import {
  failedNotificationUpdate,
  leadNotificationConfig,
  notifyInternalLead,
  validateLeadNotificationConfig,
} from "@/lib/server/lead-notifications";

const MAX_BODY_BYTES = 16_384;
const RETENTION_DAYS = 180;
const sources = new Set<ConsultationSource>(consultationSourceValues);
const detailSources = new Set<ConsultationSource>(["page", "product-topic", "product-detail", "case-detail", "solutions", "partners"]);
const stages = new Set<ContactRequest["stage"]>(["understanding", "planning", "delivery", "operation"]);
const channels = new Set<ContactRequest["contactChannel"]>(["phone", "email", "wechat"]);

const directionContext = {
  home: { scene: "home-health", intent: "space-advice" },
  project: { scene: "project", intent: "project-brief" },
  channel: { scene: "channel", intent: "partnership" },
} as const satisfies Record<ContactRequest["direction"], Pick<ContactRequest, "scene" | "intent">>;

class ValidationError extends Error {}

function requiredString(value: unknown, label: string, minimum: number, maximum: number) {
  if (typeof value !== "string") throw new ValidationError(`${label}格式不正确`);
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) throw new ValidationError(`${label}长度不正确`);
  return normalized;
}

function normalizePayload(value: unknown): ContactRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ValidationError("请求内容格式不正确");
  const input = value as Record<string, unknown>;
  const direction = input.direction;
  if (direction !== "home" && direction !== "project" && direction !== "channel") throw new ValidationError("咨询方向不正确");
  const expected = directionContext[direction];
  if (input.scene !== expected.scene || input.intent !== expected.intent) throw new ValidationError("咨询场景与方向不匹配");
  if (typeof input.source !== "string" || !sources.has(input.source as ConsultationSource)) throw new ValidationError("咨询来源不正确");
  const source = input.source as ConsultationSource;
  const rawDetail = input.sourceDetail;
  if (rawDetail !== undefined && rawDetail !== null && rawDetail !== "" && !detailSources.has(source)) throw new ValidationError("咨询来源详情不适用");
  const sourceDetail = detailSources.has(source) && rawDetail !== undefined && rawDetail !== null && rawDetail !== ""
    ? requiredString(rawDetail, "咨询来源详情", 1, 80)
    : undefined;
  if (sourceDetail && !/^[a-z0-9-]+$/i.test(sourceDetail)) throw new ValidationError("咨询来源详情格式不正确");
  if (typeof input.stage !== "string" || !stages.has(input.stage as ContactRequest["stage"])) throw new ValidationError("项目阶段不正确");
  if (typeof input.contactChannel !== "string" || !channels.has(input.contactChannel as ContactRequest["contactChannel"])) throw new ValidationError("联系渠道不正确");
  const contactChannel = input.contactChannel as ContactRequest["contactChannel"];
  const contactValue = requiredString(input.contactValue, "联系方式", 5, 80);
  if (contactChannel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) throw new ValidationError("邮箱格式不正确");
  if (contactChannel === "phone" && (!/^[+\d\s()\-]+$/.test(contactValue) || contactValue.replace(/\D/g, "").length < 7)) throw new ValidationError("电话号码格式不正确");
  if (contactChannel === "wechat" && /[\u0000-\u001f\u007f]/.test(contactValue)) throw new ValidationError("微信联系方式格式不正确");
  if (input.consent !== true) throw new ValidationError("请先确认数据处理说明");
  if (input.privacyVersion !== CONSULTATION_PRIVACY_VERSION) throw new ValidationError("数据处理说明版本已更新，请刷新后重试");
  const clientRequestId = requiredString(input.clientRequestId, "提交标识", 36, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(clientRequestId)) throw new ValidationError("提交标识格式不正确");
  const turnstileToken = typeof input.turnstileToken === "string" && input.turnstileToken.trim()
    ? requiredString(input.turnstileToken, "安全校验", 1, 2_048)
    : undefined;

  return {
    direction,
    source,
    ...(sourceDetail ? { sourceDetail } : {}),
    scene: expected.scene,
    intent: expected.intent,
    project: requiredString(input.project, "项目或业务概况", 4, 80),
    stage: input.stage as ContactRequest["stage"],
    need: requiredString(input.need, "希望解决的问题", 12, 360),
    contactName: requiredString(input.contactName, "联系人称呼", 2, 40),
    contactChannel,
    contactValue,
    consent: true,
    privacyVersion: CONSULTATION_PRIVACY_VERSION,
    clientRequestId,
    ...(turnstileToken ? { turnstileToken } : {}),
  };
}

function createLeadId(now: Date) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `JUHAO-${date}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicIntakeReady() {
  return env.PUBLIC_INTAKE_READY?.trim().toLowerCase() === "true";
}

function publicIntakeConfigurationError() {
  if (!publicIntakeReady()) return null;
  if (!env.JUHAO_LEAD_WEBHOOK_URL?.trim() || !env.JUHAO_LEAD_WEBHOOK_SECRET?.trim()) return "内部通知尚未配置";
  if (!env.JUHAO_LEAD_MAINTENANCE_SECRET?.trim()) return "线索维护任务尚未配置";
  if (!env.TURNSTILE_SECRET_KEY?.trim()) return "安全校验尚未配置";
  return null;
}

async function verifyTurnstile(token: string | undefined, request: Request) {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  const remoteIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (remoteIp) body.set("remoteip", remoteIp);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: unknown };
    return result.success === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function json(data: unknown, status: number) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) return json({ error: "请求来源不正确" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "请求格式不正确" }, 415);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json({ error: "请求内容过大" }, 413);

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return json({ error: "请求内容过大" }, 413);

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return json({ error: "请求内容格式不正确" }, 400);
  }

  if (input && typeof input === "object" && !Array.isArray(input) && typeof (input as Record<string, unknown>).website === "string" && (input as Record<string, string>).website.trim()) {
    const submittedAt = new Date().toISOString();
    return json({ id: createLeadId(new Date(submittedAt)), status: "received", submittedAt }, 201);
  }

  let payload: ContactRequest;
  try {
    payload = normalizePayload(input);
  } catch (error) {
    return json({ error: error instanceof ValidationError ? error.message : "请求内容格式不正确" }, 400);
  }

  const configurationError = publicIntakeConfigurationError();
  if (configurationError) return json({ error: `公开咨询入口未就绪：${configurationError}` }, 503);

  const notificationConfig = leadNotificationConfig(env);
  try {
    validateLeadNotificationConfig(notificationConfig);
  } catch {
    return json({ error: "内部通知配置不完整，请稍后重试" }, 503);
  }

  if (publicIntakeReady() && !await verifyTurnstile(payload.turnstileToken, request)) {
    return json({ error: "安全校验未通过，请刷新后重试" }, 403);
  }

  if (!env.DB) return json({ error: "咨询服务暂时不可用，请稍后重试" }, 503);

  const now = new Date();
  const submittedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1_000).toISOString();
  const hashPayload = { ...payload };
  delete hashPayload.turnstileToken;
  const requestHash = await sha256(JSON.stringify(hashPayload));
  const webhookConfigured = Boolean(notificationConfig.webhookUrl && notificationConfig.webhookSecret);
  const lead: ConsultationLeadRecord = {
    id: createLeadId(now),
    clientRequestId: payload.clientRequestId,
    requestHash,
    direction: payload.direction,
    source: payload.source,
    sourceDetail: payload.sourceDetail ?? null,
    scene: payload.scene,
    intent: payload.intent,
    project: payload.project,
    stage: payload.stage,
    need: payload.need,
    contactName: payload.contactName,
    contactChannel: payload.contactChannel,
    contactValue: payload.contactValue,
    privacyVersion: payload.privacyVersion,
    consentAt: submittedAt,
    status: "received",
    notificationStatus: webhookConfigured ? "pending" : "not_configured",
    notificationAttempts: 0,
    notificationLastError: null,
    notificationLastAttemptAt: null,
    notificationNextAttemptAt: null,
    createdAt: submittedAt,
    expiresAt,
  };

  try {
    await purgeExpiredConsultationLeads(env.DB, submittedAt);
    const { created, stored } = await insertConsultationLead(env.DB, lead);
    if (!created) {
      if (stored.request_hash !== requestHash) return json({ error: "该提交标识已被使用，请重新提交" }, 409);
      return json({ id: stored.id, status: "received", submittedAt: stored.submitted_at }, 200);
    }

    if (webhookConfigured) {
      const attemptedAt = new Date();
      try {
        await notifyInternalLead(lead, notificationConfig);
        await updateConsultationNotification(env.DB, lead.id, {
          status: "sent",
          error: null,
          attemptedAt: attemptedAt.toISOString(),
          nextAttemptAt: null,
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message.slice(0, 120) : "webhook_failed";
        const failure = failedNotificationUpdate(1, attemptedAt);
        await updateConsultationNotification(env.DB, lead.id, {
          status: failure.status,
          error: detail,
          attemptedAt: attemptedAt.toISOString(),
          nextAttemptAt: failure.nextAttemptAt,
        });
      }
    }

    return json({ id: lead.id, status: "received", submittedAt }, 201);
  } catch {
    return json({ error: "咨询服务暂时不可用，请稍后重试" }, 503);
  }
}
