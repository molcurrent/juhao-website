import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const consultationLeads = sqliteTable("consultation_leads", {
  id: text("id").primaryKey(),
  clientRequestId: text("client_request_id").notNull().unique(),
  requestHash: text("request_hash").notNull(),
  direction: text("direction").notNull(),
  source: text("source").notNull(),
  sourceDetail: text("source_detail"),
  scene: text("scene").notNull(),
  intent: text("intent").notNull(),
  project: text("project").notNull(),
  stage: text("stage").notNull(),
  need: text("need").notNull(),
  contactName: text("contact_name").notNull(),
  contactChannel: text("contact_channel").notNull(),
  contactValue: text("contact_value").notNull(),
  privacyVersion: text("privacy_version").notNull(),
  consentAt: text("consent_at").notNull(),
  status: text("status").notNull().default("received"),
  notificationStatus: text("notification_status").notNull().default("not_configured"),
  notificationAttempts: integer("notification_attempts").notNull().default(0),
  notificationLastError: text("notification_last_error"),
  notificationLastAttemptAt: text("notification_last_attempt_at"),
  notificationNextAttemptAt: text("notification_next_attempt_at"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => [
  index("consultation_leads_created_at_idx").on(table.createdAt),
  index("consultation_leads_notification_status_idx").on(table.notificationStatus),
  index("consultation_leads_notification_retry_idx").on(table.notificationStatus, table.notificationNextAttemptAt),
]);

export const consultationRateLimits = sqliteTable("consultation_rate_limits", {
  keyHash: text("key_hash").primaryKey(),
  windowStartedAt: text("window_started_at").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  expiresAt: text("expires_at").notNull(),
}, (table) => [
  index("consultation_rate_limits_expires_at_idx").on(table.expiresAt),
]);
