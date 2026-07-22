export type AnalyticsDailyIncrement = {
  eventDate: string;
  eventName: string;
  direction: string;
  source: string;
  contentId: string;
  depth: string;
  updatedAt: string;
  expiresAt: string;
};

export async function incrementAnalyticsDailyCount(database: D1Database, event: AnalyticsDailyIncrement) {
  await database.prepare(`
    INSERT INTO analytics_daily_counts (
      event_date, event_name, direction, source, content_id, depth,
      event_count, updated_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT (event_date, event_name, direction, source, content_id, depth)
    DO UPDATE SET
      event_count = event_count + 1,
      updated_at = excluded.updated_at,
      expires_at = excluded.expires_at
  `).bind(
    event.eventDate,
    event.eventName,
    event.direction,
    event.source,
    event.contentId,
    event.depth,
    event.updatedAt,
    event.expiresAt,
  ).run();
}

export async function purgeExpiredAnalyticsDailyCounts(database: D1Database, now: string, limit: number) {
  const result = await database.prepare(`
    DELETE FROM analytics_daily_counts
    WHERE rowid IN (
      SELECT rowid FROM analytics_daily_counts
      WHERE expires_at <= ?
      ORDER BY expires_at ASC
      LIMIT ?
    )
  `).bind(now, limit).run();
  return result.meta.changes ?? 0;
}
