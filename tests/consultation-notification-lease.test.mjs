import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  CONSULTATION_NOTIFICATION_LEASE_MS,
  claimConsultationNotification,
  completeConsultationNotification,
} from "../db/consultation-leads.ts";
import {
  CONSULTATION_NOTIFICATION_RETRY_DELAYS_MS,
  failedNotificationUpdate,
} from "../lib/server/lead-notifications.ts";

const migrations = [
  "../drizzle/0000_brief_madame_hydra.sql",
  "../drizzle/0001_magenta_black_crow.sql",
  "../drizzle/0002_cultured_mother_askani.sql",
  "../drizzle/0003_magical_clea.sql",
  "../drizzle/0004_lush_roulette.sql",
  "../drizzle/0005_luxuriant_hairball.sql",
].map((path) => new URL(path, import.meta.url));

class SqliteD1Statement {
  constructor(statement) {
    this.statement = statement;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    return this.statement.get(...this.values) ?? null;
  }

  async run() {
    const result = this.statement.run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }
}

class SqliteD1 {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new SqliteD1Statement(this.database.prepare(sql));
  }
}

function openDatabase() {
  const database = new DatabaseSync(":memory:");
  for (const migration of migrations) database.exec(readFileSync(migration, "utf8"));
  return database;
}

function insertPendingLead(database, id, createdAt = "2026-07-22T00:00:00.000Z") {
  database.prepare(`
    INSERT INTO consultation_leads (
      id, client_request_id, request_hash, direction, source, scene, intent,
      project, stage, need, contact_name, contact_channel, contact_value,
      privacy_version, consent_at, notification_status, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    `request-${id}`,
    `hash-${id}`,
    "project",
    "direct",
    "project",
    "project-brief",
    "照明项目",
    "planning",
    "需要一份可执行的照明建议",
    "测试联系人",
    "email",
    "test@example.com",
    "2026-07-22",
    createdAt,
    "pending",
    createdAt,
    "2027-01-18T00:00:00.000Z",
  );
}

test("atomically claims one notification and rejects a stale completion after lease recovery", async () => {
  const database = openDatabase();
  try {
    insertPendingLead(database, "lead-atomic");
    const d1 = new SqliteD1(database);
    const firstAttemptAt = new Date("2026-07-22T00:00:00.000Z");
    const claims = (await Promise.all([
      claimConsultationNotification(d1, firstAttemptAt, "lead-atomic"),
      claimConsultationNotification(d1, firstAttemptAt, "lead-atomic"),
    ])).filter(Boolean);

    assert.equal(claims.length, 1);
    assert.equal(claims[0].notificationAttempts, 1);
    assert.equal(
      Date.parse(claims[0].notificationNextAttemptAt) - firstAttemptAt.getTime(),
      CONSULTATION_NOTIFICATION_LEASE_MS,
    );
    assert.equal(
      await claimConsultationNotification(
        d1,
        new Date(firstAttemptAt.getTime() + CONSULTATION_NOTIFICATION_LEASE_MS - 1),
        "lead-atomic",
      ),
      null,
    );

    const recovered = await claimConsultationNotification(
      d1,
      new Date(firstAttemptAt.getTime() + CONSULTATION_NOTIFICATION_LEASE_MS + 1),
      "lead-atomic",
    );
    assert.ok(recovered);
    assert.equal(recovered.notificationAttempts, 2);
    assert.equal(await completeConsultationNotification(d1, claims[0], {
      status: "sent",
      error: null,
      nextAttemptAt: null,
    }), false);
    assert.equal(await completeConsultationNotification(d1, recovered, {
      status: "sent",
      error: null,
      nextAttemptAt: null,
    }), true);

    const stored = database.prepare(`
      SELECT notification_status, notification_attempts, notification_next_attempt_at
      FROM consultation_leads WHERE id = ?
    `).get("lead-atomic");
    assert.deepEqual({ ...stored }, {
      notification_status: "sent",
      notification_attempts: 2,
      notification_next_attempt_at: null,
    });
  } finally {
    database.close();
  }
});

test("uses 5m/30m/2h/12h backoff and recovers a crashed fifth claim before dead letter", async () => {
  const attemptedAt = new Date("2026-07-22T00:00:00.000Z");
  for (const [index, expectedDelay] of CONSULTATION_NOTIFICATION_RETRY_DELAYS_MS.entries()) {
    const failure = failedNotificationUpdate(index + 1, attemptedAt);
    assert.equal(failure.status, "retry");
    assert.equal(Date.parse(failure.nextAttemptAt) - attemptedAt.getTime(), expectedDelay);
  }
  assert.deepEqual(failedNotificationUpdate(5, attemptedAt), {
    status: "dead_letter",
    nextAttemptAt: null,
  });

  const database = openDatabase();
  try {
    insertPendingLead(database, "lead-crashed-fifth");
    const d1 = new SqliteD1(database);
    let claim;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      claim = await claimConsultationNotification(
        d1,
        new Date(attemptedAt.getTime() + attempt * (CONSULTATION_NOTIFICATION_LEASE_MS + 1)),
        "lead-crashed-fifth",
      );
      assert.ok(claim);
      assert.equal(claim.notificationAttempts, attempt + 1);
    }

    assert.equal(await claimConsultationNotification(
      d1,
      new Date(Date.parse(claim.notificationNextAttemptAt) - 1),
      "lead-crashed-fifth",
    ), null);
    const recoveredFifth = await claimConsultationNotification(
      d1,
      new Date(Date.parse(claim.notificationNextAttemptAt) + 1),
      "lead-crashed-fifth",
    );
    assert.ok(recoveredFifth);
    assert.equal(recoveredFifth.notificationAttempts, 5);
    const finalFailure = failedNotificationUpdate(
      recoveredFifth.notificationAttempts,
      new Date(recoveredFifth.notificationLastAttemptAt),
    );
    assert.equal(await completeConsultationNotification(d1, recoveredFifth, {
      status: finalFailure.status,
      error: "webhook_http_503",
      nextAttemptAt: finalFailure.nextAttemptAt,
    }), true);
    const stored = database.prepare(`
      SELECT notification_status, notification_attempts, notification_last_error
      FROM consultation_leads WHERE id = ?
    `).get("lead-crashed-fifth");
    assert.deepEqual({ ...stored }, {
      notification_status: "dead_letter",
      notification_attempts: 5,
      notification_last_error: "webhook_http_503",
    });
    assert.equal(await claimConsultationNotification(
      d1,
      new Date(Date.parse(recoveredFifth.notificationNextAttemptAt) + 2),
      "lead-crashed-fifth",
    ), null);
  } finally {
    database.close();
  }
});

test("scheduled maintenance logs only structured counts and elevates dead letters to error", async (context) => {
  const { default: worker } = await import("../dist/server/index.js");
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalError = console.error;
  const logs = [];
  const errors = [];
  console.log = (line) => logs.push(String(line));
  console.error = (line) => errors.push(String(line));
  globalThis.fetch = async () => new Response(null, { status: 503 });
  context.after(() => {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;
  });

  async function runScheduled(database, runtime = {}) {
    let backgroundTask;
    worker.scheduled(
      {
        scheduledTime: Date.parse("2026-07-22T12:00:00.000Z"),
        cron: "*/5 * * * *",
        noRetry() {},
      },
      { DB: new SqliteD1(database), ...runtime },
      { waitUntil(promise) { backgroundTask = promise; } },
    );
    assert.ok(backgroundTask);
    await backgroundTask;
  }

  const emptyDatabase = openDatabase();
  try {
    await runScheduled(emptyDatabase);
    assert.equal(logs.length, 1);
    assert.equal(errors.length, 0);
    assert.deepEqual(JSON.parse(logs[0]), {
      event: "consultation_maintenance",
      outcome: "completed",
      scheduledAt: "2026-07-22T12:00:00.000Z",
      cron: "*/5 * * * *",
      notification: "not_configured",
      counts: {
        purged: 0,
        rateLimitsPurged: 0,
        analyticsPurged: 0,
        attempted: 0,
        sent: 0,
        retry: 0,
        deadLetter: 0,
        stale: 0,
      },
    });
  } finally {
    emptyDatabase.close();
  }

  const deadLetterDatabase = openDatabase();
  try {
    insertPendingLead(deadLetterDatabase, "lead-private-log-check");
    deadLetterDatabase.prepare(`
      UPDATE consultation_leads
      SET notification_status = 'retry', notification_attempts = 4,
          notification_next_attempt_at = NULL
      WHERE id = ?
    `).run("lead-private-log-check");
    await runScheduled(deadLetterDatabase, {
      JUHAO_LEAD_WEBHOOK_URL: "https://hooks.juhao.test/leads",
      JUHAO_LEAD_WEBHOOK_SECRET: "test-webhook-secret-at-least-32-characters",
    });

    assert.equal(errors.length, 1);
    const deadLetterLog = JSON.parse(errors[0]);
    assert.equal(deadLetterLog.outcome, "dead_letter_detected");
    assert.equal(deadLetterLog.counts.attempted, 1);
    assert.equal(deadLetterLog.counts.deadLetter, 1);
    assert.equal(deadLetterLog.counts.sent, 0);
    assert.equal(deadLetterLog.counts.retry, 0);
    assert.doesNotMatch(errors[0], /lead-private-log-check|测试联系人|test@example\.com|照明项目/);
  } finally {
    deadLetterDatabase.close();
  }
});
