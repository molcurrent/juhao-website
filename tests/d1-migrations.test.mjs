import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrationUrls = [
  "../drizzle/0000_brief_madame_hydra.sql",
  "../drizzle/0001_magenta_black_crow.sql",
  "../drizzle/0002_cultured_mother_askani.sql",
  "../drizzle/0003_magical_clea.sql",
  "../drizzle/0004_lush_roulette.sql",
  "../drizzle/0005_luxuriant_hairball.sql",
].map((path) => new URL(path, import.meta.url));

test("upgrades an existing consultation database before the role-aware API is deployed", () => {
  const database = new DatabaseSync(":memory:");
  try {
    for (const url of migrationUrls.slice(0, 4)) database.exec(readFileSync(url, "utf8"));

    database.prepare(`
      INSERT INTO consultation_leads (
        id, client_request_id, request_hash, direction, source, source_detail, scene, intent,
        project, stage, need, contact_name, contact_channel, contact_value, privacy_version,
        consent_at, status, notification_status, notification_attempts, notification_last_error,
        notification_last_attempt_at, notification_next_attempt_at, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "JUHAO-20260720-OLD00001",
      "550e8400-e29b-41d4-a716-446655440040",
      "old-request-hash",
      "project",
      "direct",
      null,
      "project",
      "project-brief",
      "迁移前已保存的工程咨询",
      "planning",
      "用于验证旧线索在新增角色字段后仍可读取和重试",
      "陈先生",
      "email",
      "chen@example.com",
      "2026-07-18",
      "2026-07-20T00:00:00.000Z",
      "received",
      "retry",
      1,
      "webhook_http_503",
      "2026-07-20T00:00:01.000Z",
      null,
      "2026-07-20T00:00:00.000Z",
      "2027-01-16T00:00:00.000Z",
    );

    database.exec(readFileSync(migrationUrls[4], "utf8"));

    const roleColumns = ["project_type", "area", "location", "organization", "current_business"];
    const columns = database.prepare("PRAGMA table_info(consultation_leads)").all().map((column) => column.name);
    for (const column of roleColumns) assert.ok(columns.includes(column), column);

    const upgraded = database.prepare(`
      SELECT project_type, area, location, organization, current_business
      FROM consultation_leads
      WHERE client_request_id = ?
    `).get("550e8400-e29b-41d4-a716-446655440040");
    assert.deepEqual({ ...upgraded }, {
      project_type: null,
      area: null,
      location: null,
      organization: null,
      current_business: null,
    });

    const statement = database.prepare(`
      INSERT INTO consultation_leads (
        id, client_request_id, request_hash, direction, source, source_detail, scene, intent,
        project, project_type, area, location, organization, current_business,
        stage, need, contact_name, contact_channel, contact_value, privacy_version,
        consent_at, status, notification_status, notification_attempts, notification_last_error,
        notification_last_attempt_at, notification_next_attempt_at, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = statement.run(
      "JUHAO-20260722-NEW00001",
      "550e8400-e29b-41d4-a716-446655440041",
      "new-request-hash",
      "project",
      "page",
      "solutions-commercial",
      "project",
      "project-brief",
      "商业空间照明方案咨询",
      "商业空间",
      "约 1200㎡",
      "上海",
      "示例设计团队",
      null,
      "planning",
      "希望梳理重点照明与基础照明的选择边界",
      "周女士",
      "email",
      "zhou@example.com",
      "2026-07-22",
      "2026-07-22T00:00:00.000Z",
      "received",
      "pending",
      0,
      null,
      null,
      null,
      "2026-07-22T00:00:00.000Z",
      "2027-01-18T00:00:00.000Z",
    );
    assert.equal(result.changes, 1);
  } finally {
    database.close();
  }
});

test("adds daily aggregate analytics without visitor identifiers", () => {
  const database = new DatabaseSync(":memory:");
  try {
    for (const url of migrationUrls) database.exec(readFileSync(url, "utf8"));

    const columns = database.prepare("PRAGMA table_info(analytics_daily_counts)").all();
    assert.deepEqual(columns.map((column) => column.name), [
      "event_date",
      "event_name",
      "direction",
      "source",
      "content_id",
      "depth",
      "event_count",
      "updated_at",
      "expires_at",
    ]);
    assert.deepEqual(
      columns.filter((column) => column.pk > 0).sort((left, right) => left.pk - right.pk).map((column) => column.name),
      ["event_date", "event_name", "direction", "source", "content_id", "depth"],
    );

    const indexes = database.prepare("PRAGMA index_list(analytics_daily_counts)").all().map((index) => index.name);
    assert.ok(indexes.includes("analytics_daily_counts_expires_at_idx"));

    const increment = database.prepare(`
      INSERT INTO analytics_daily_counts (
        event_date, event_name, direction, source, content_id, depth,
        event_count, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT (event_date, event_name, direction, source, content_id, depth)
      DO UPDATE SET event_count = event_count + 1, updated_at = excluded.updated_at, expires_at = excluded.expires_at
    `);
    const values = [
      "2026-07-22",
      "product_detail_view",
      "",
      "",
      "9236",
      "",
      "2026-07-22T10:00:00.000Z",
      "2027-08-26T10:00:00.000Z",
    ];
    increment.run(...values);
    increment.run(...values);
    assert.equal(database.prepare("SELECT event_count FROM analytics_daily_counts").get().event_count, 2);
  } finally {
    database.close();
  }
});
