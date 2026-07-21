export type ConsultationLeadRecord = {
  id: string;
  clientRequestId: string;
  requestHash: string;
  direction: string;
  source: string;
  sourceDetail: string | null;
  scene: string;
  intent: string;
  project: string;
  stage: string;
  need: string;
  contactName: string;
  contactChannel: string;
  contactValue: string;
  privacyVersion: string;
  consentAt: string;
  status: "received";
  notificationStatus: ConsultationNotificationStatus;
  notificationAttempts: number;
  notificationLastError: string | null;
  notificationLastAttemptAt: string | null;
  notificationNextAttemptAt: string | null;
  createdAt: string;
  expiresAt: string;
};

export type ConsultationNotificationStatus = "pending" | "sent" | "retry" | "dead_letter" | "not_configured";

type StoredLead = {
  id: string;
  client_request_id: string;
  request_hash: string;
  submitted_at: string;
};

export async function findConsultationLeadById(db: D1Database, id: string, now: string) {
  return db.prepare(`
    SELECT id, created_at AS submitted_at
    FROM consultation_leads
    WHERE id = ? AND expires_at >= ?
  `).bind(id, now).first<{ id: string; submitted_at: string }>();
}

export async function purgeExpiredConsultationLeads(db: D1Database, now: string) {
  const result = await db.prepare("DELETE FROM consultation_leads WHERE expires_at < ?").bind(now).run();
  return Number(result.meta.changes ?? 0);
}

export async function consumeConsultationRateLimit(
  db: D1Database,
  keyHash: string,
  now: Date,
  maximum: number,
  windowMilliseconds: number,
) {
  const windowStartedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + windowMilliseconds).toISOString();
  const row = await db.prepare(`
    INSERT INTO consultation_rate_limits (key_hash, window_started_at, request_count, expires_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      window_started_at = CASE
        WHEN consultation_rate_limits.expires_at <= excluded.window_started_at THEN excluded.window_started_at
        ELSE consultation_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN consultation_rate_limits.expires_at <= excluded.window_started_at THEN 1
        ELSE consultation_rate_limits.request_count + 1
      END,
      expires_at = CASE
        WHEN consultation_rate_limits.expires_at <= excluded.window_started_at THEN excluded.expires_at
        ELSE consultation_rate_limits.expires_at
      END
    RETURNING request_count AS requestCount, expires_at AS expiresAt
  `).bind(keyHash, windowStartedAt, expiresAt).first<{ requestCount: number; expiresAt: string }>();
  if (!row) throw new Error("咨询频率限制写入失败");
  return {
    allowed: Number(row.requestCount) <= maximum,
    retryAfterSeconds: Math.max(1, Math.ceil((Date.parse(row.expiresAt) - now.getTime()) / 1_000)),
  };
}

export async function purgeExpiredConsultationRateLimits(db: D1Database, now: string) {
  const result = await db.prepare("DELETE FROM consultation_rate_limits WHERE expires_at < ?").bind(now).run();
  return Number(result.meta.changes ?? 0);
}

export async function insertConsultationLead(db: D1Database, lead: ConsultationLeadRecord) {
  const result = await db.prepare(`
    INSERT INTO consultation_leads (
      id, client_request_id, request_hash, direction, source, source_detail, scene, intent,
      project, stage, need, contact_name, contact_channel, contact_value, privacy_version,
      consent_at, status, notification_status, notification_attempts, notification_last_error,
      notification_last_attempt_at, notification_next_attempt_at,
      created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_request_id) DO NOTHING
  `).bind(
    lead.id,
    lead.clientRequestId,
    lead.requestHash,
    lead.direction,
    lead.source,
    lead.sourceDetail,
    lead.scene,
    lead.intent,
    lead.project,
    lead.stage,
    lead.need,
    lead.contactName,
    lead.contactChannel,
    lead.contactValue,
    lead.privacyVersion,
    lead.consentAt,
    lead.status,
    lead.notificationStatus,
    lead.notificationAttempts,
    lead.notificationLastError,
    lead.notificationLastAttemptAt,
    lead.notificationNextAttemptAt,
    lead.createdAt,
    lead.expiresAt,
  ).run();

  const stored = await db.prepare(`
    SELECT id, client_request_id, request_hash, created_at AS submitted_at
    FROM consultation_leads
    WHERE client_request_id = ?
  `).bind(lead.clientRequestId).first<StoredLead>();

  if (!stored) throw new Error("咨询线索写入失败");
  return { created: Number(result.meta.changes ?? 0) > 0, stored };
}

export async function updateConsultationNotification(
  db: D1Database,
  id: string,
  update: {
    status: Exclude<ConsultationNotificationStatus, "pending" | "not_configured">;
    error: string | null;
    attemptedAt: string;
    nextAttemptAt: string | null;
  },
) {
  await db.prepare(`
    UPDATE consultation_leads
    SET notification_status = ?,
        notification_attempts = notification_attempts + 1,
        notification_last_error = ?,
        notification_last_attempt_at = ?,
        notification_next_attempt_at = ?
    WHERE id = ?
  `).bind(update.status, update.error, update.attemptedAt, update.nextAttemptAt, id).run();
}

type RetryableLeadRow = {
  id: string;
  clientRequestId: string;
  requestHash: string;
  direction: string;
  source: string;
  sourceDetail: string | null;
  scene: string;
  intent: string;
  project: string;
  stage: string;
  need: string;
  contactName: string;
  contactChannel: string;
  contactValue: string;
  privacyVersion: string;
  consentAt: string;
  status: "received";
  notificationStatus: "pending" | "retry";
  notificationAttempts: number;
  notificationLastError: string | null;
  notificationLastAttemptAt: string | null;
  notificationNextAttemptAt: string | null;
  createdAt: string;
  expiresAt: string;
};

export async function listRetryableConsultationLeads(db: D1Database, now: string, limit = 25) {
  const result = await db.prepare(`
    SELECT
      id,
      client_request_id AS clientRequestId,
      request_hash AS requestHash,
      direction,
      source,
      source_detail AS sourceDetail,
      scene,
      intent,
      project,
      stage,
      need,
      contact_name AS contactName,
      contact_channel AS contactChannel,
      contact_value AS contactValue,
      privacy_version AS privacyVersion,
      consent_at AS consentAt,
      status,
      notification_status AS notificationStatus,
      notification_attempts AS notificationAttempts,
      notification_last_error AS notificationLastError,
      notification_last_attempt_at AS notificationLastAttemptAt,
      notification_next_attempt_at AS notificationNextAttemptAt,
      created_at AS createdAt,
      expires_at AS expiresAt
    FROM consultation_leads
    WHERE notification_status IN ('pending', 'retry')
      AND (notification_next_attempt_at IS NULL OR notification_next_attempt_at <= ?)
    ORDER BY created_at ASC
    LIMIT ?
  `).bind(now, limit).all<RetryableLeadRow>();
  return result.results;
}
