import { env, waitUntil } from "cloudflare:workers";
import {
  claimConsultationNotification,
  completeConsultationNotification,
  consumeConsultationRateLimit,
  insertConsultationLead,
  type ConsultationLeadRecord,
} from "@/db/consultation-leads";
import type { ContactRequest } from "@/lib/api/types";
import {
  CONSULTATION_PRIVACY_VERSION,
  CONSULTATION_TURNSTILE_ACTION,
  consultationSourceValues,
  type ConsultationSource,
} from "@/lib/consultation";
import {
  failedNotificationUpdate,
  leadNotificationConfig,
  notifyInternalLead,
  validateLeadNotificationConfig,
} from "@/lib/server/lead-notifications";
import { recordAnalyticsAggregate } from "@/lib/server/analytics";

const MAX_BODY_BYTES = 16_384;
const RETENTION_DAYS = 180;
const RATE_LIMIT_MAXIMUM = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const sources = new Set<ConsultationSource>(consultationSourceValues);
const detailSources = new Set<ConsultationSource>(["page", "products", "product-topic", "product-detail", "case-detail", "solutions", "partners"]);
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

async function hmacSha256(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicIntakeReady() {
  return env.PUBLIC_INTAKE_READY?.trim().toLowerCase() === "true";
}

function contactEdgeRateLimitVerified() {
  return env.CONTACT_EDGE_RATE_LIMIT_VERIFIED?.trim().toLowerCase() === "true";
}

function turnstileAllowedHostnames() {
  const values = (env.TURNSTILE_ALLOWED_HOSTNAMES ?? "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0) return null;
  for (const hostname of values) {
    if (hostname.startsWith(".") || hostname.endsWith(".") || hostname.includes("..")) return null;
    try {
      const parsed = new URL(`https://${hostname}`);
      if (
        parsed.hostname !== hostname
        || parsed.port
        || parsed.pathname !== "/"
        || parsed.search
        || parsed.hash
        || parsed.username
        || parsed.password
      ) return null;
    } catch {
      return null;
    }
  }
  return new Set(values);
}

function validClientAddress(value: string) {
  if (!value || value.length > 45) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  if (!value.includes(":") || !/^[0-9a-f:.]+$/i.test(value)) return false;
  try {
    new URL(`http://[${value}]`);
    return true;
  } catch {
    return false;
  }
}

function publicIntakeConfigurationError() {
  if (!publicIntakeReady()) return null;
  if (!env.JUHAO_LEAD_WEBHOOK_URL?.trim() || !env.JUHAO_LEAD_WEBHOOK_SECRET?.trim()) return "内部通知尚未配置";
  if (!env.JUHAO_LEAD_MAINTENANCE_SECRET?.trim()) return "线索维护任务尚未配置";
  if (!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) return "安全校验公钥尚未配置";
  if (!env.TURNSTILE_SECRET_KEY?.trim()) return "安全校验尚未配置";
  if (!turnstileAllowedHostnames()) return "安全校验允许域名配置不正确";
  if (!contactEdgeRateLimitVerified()) return "边缘频率限制尚未核验";
  if ((env.JUHAO_LEAD_RATE_LIMIT_SECRET?.trim().length ?? 0) < 32) return "提交频率限制密钥长度不足";
  return null;
}

type TurnstileVerification = "valid" | "invalid" | "unavailable";

async function verifyTurnstile(
  token: string | undefined,
  clientAddress: string,
  requestHostname: string,
): Promise<TurnstileVerification> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return "unavailable";
  if (!token) return "invalid";
  const body = new URLSearchParams({ secret, response: token, remoteip: clientAddress });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return response.status === 429 || response.status >= 500 ? "unavailable" : "invalid";
    const result = await response.json() as {
      success?: unknown;
      action?: unknown;
      hostname?: unknown;
      "error-codes"?: unknown;
    };
    if (result.success !== true) {
      const errorCodes = Array.isArray(result["error-codes"])
        ? result["error-codes"].filter((code): code is string => typeof code === "string")
        : [];
      return errorCodes.includes("internal-error") ? "unavailable" : "invalid";
    }
    const hostname = typeof result.hostname === "string" ? result.hostname.trim().toLowerCase() : "";
    const action = typeof result.action === "string" ? result.action : "";
    const allowedHostnames = turnstileAllowedHostnames();
    return action === CONSULTATION_TURNSTILE_ACTION
      && hostname === requestHostname.toLowerCase()
      && Boolean(allowedHostnames?.has(hostname))
      ? "valid"
      : "invalid";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timeout);
  }
}

function json(data: unknown, status: number) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function deliverInitialNotification(
  database: D1Database,
  lead: ConsultationLeadRecord,
  notificationConfig: ReturnType<typeof leadNotificationConfig>,
) {
  const attemptedAt = new Date();
  const claim = await claimConsultationNotification(database, attemptedAt, lead.id);
  if (!claim) return;
  try {
    await notifyInternalLead(claim, notificationConfig);
    await completeConsultationNotification(database, claim, {
      status: "sent",
      error: null,
      nextAttemptAt: null,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 120) : "webhook_failed";
    const failure = failedNotificationUpdate(claim.notificationAttempts, attemptedAt);
    await completeConsultationNotification(database, claim, {
      status: failure.status,
      error: detail,
      nextAttemptAt: failure.nextAttemptAt,
    });
  }
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

  if (!env.DB) return json({ error: "咨询服务暂时不可用，请稍后重试" }, 503);

  const now = new Date();
  if (publicIntakeReady()) {
    const clientAddress = request.headers.get("CF-Connecting-IP")?.trim();
    if (!clientAddress || !validClientAddress(clientAddress)) {
      return json({ error: "咨询服务暂时不可用，请稍后重试" }, 503);
    }
    const turnstileVerification = await verifyTurnstile(payload.turnstileToken, clientAddress, requestUrl.hostname);
    if (turnstileVerification === "unavailable") {
      return json({ error: "安全校验服务暂时不可用，请稍后重试" }, 503);
    }
    if (turnstileVerification === "invalid") {
      return json({ error: "安全校验未通过，请刷新后重试" }, 403);
    }

    const rateLimitKey = await hmacSha256(env.JUHAO_LEAD_RATE_LIMIT_SECRET!.trim(), clientAddress);
    let rateLimit: Awaited<ReturnType<typeof consumeConsultationRateLimit>>;
    try {
      rateLimit = await consumeConsultationRateLimit(
        env.DB,
        rateLimitKey,
        now,
        RATE_LIMIT_MAXIMUM,
        RATE_LIMIT_WINDOW_MS,
      );
    } catch {
      return json({ error: "咨询服务暂时不可用，请稍后重试" }, 503);
    }
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "提交过于频繁，请稍后再试" },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }
  }

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
    const { created, stored } = await insertConsultationLead(env.DB, lead);
    if (!created) {
      if (stored.request_hash !== requestHash) return json({ error: "该提交标识已被使用，请重新提交" }, 409);
      return json({ id: stored.id, status: "received", submittedAt: stored.submitted_at }, 200);
    }

    try {
      await recordAnalyticsAggregate(env, {
        name: "consultation_lead_created",
        source: payload.source,
        direction: payload.direction,
      });
    } catch {
      // 分析聚合不能影响已经成功写入的咨询线索。
    }

    if (webhookConfigured) {
      waitUntil(deliverInitialNotification(env.DB, lead, notificationConfig));
    }

    return json({ id: lead.id, status: "received", submittedAt }, 201);
  } catch {
    return json({ error: "咨询服务暂时不可用，请稍后重试" }, 503);
  }
}
