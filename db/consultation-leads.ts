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
  notificationStatus: "pending" | "sent" | "failed" | "not_configured";
  notificationAttempts: number;
  notificationLastError: string | null;
  createdAt: string;
  expiresAt: string;
};

type StoredLead = {
  id: string;
  client_request_id: string;
  request_hash: string;
  submitted_at: string;
};

export async function findConsultationLeadById(db: D1Database, id: string) {
  return db.prepare(`
    SELECT id, created_at AS submitted_at
    FROM consultation_leads
    WHERE id = ?
  `).bind(id).first<{ id: string; submitted_at: string }>();
}

export async function purgeExpiredConsultationLeads(db: D1Database, now: string) {
  await db.prepare("DELETE FROM consultation_leads WHERE expires_at < ?").bind(now).run();
}

export async function insertConsultationLead(db: D1Database, lead: ConsultationLeadRecord) {
  const result = await db.prepare(`
    INSERT INTO consultation_leads (
      id, client_request_id, request_hash, direction, source, source_detail, scene, intent,
      project, stage, need, contact_name, contact_channel, contact_value, privacy_version,
      consent_at, status, notification_status, notification_attempts, notification_last_error,
      created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  status: "sent" | "failed",
  error: string | null,
) {
  await db.prepare(`
    UPDATE consultation_leads
    SET notification_status = ?,
        notification_attempts = notification_attempts + 1,
        notification_last_error = ?
    WHERE id = ?
  `).bind(status, error, id).run();
}
