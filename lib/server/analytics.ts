import { incrementAnalyticsDailyCount } from "@/db/analytics";
import { analyticsWriteReady } from "@/lib/analytics/config";
import type { AnalyticsEvent } from "@/lib/analytics/events";

const RETENTION_DAYS = 400;

type AnalyticsEnv = Pick<Cloudflare.Env, "NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED" | "PRIVACY_ANALYTICS_WRITE_ENABLED" | "ANALYTICS_D1_MIGRATION_VERIFIED" | "ANALYTICS_CLIENT_BUILD_VERIFIED" | "ANALYTICS_EDGE_RATE_LIMIT_VERIFIED" | "ANALYTICS_PRIVACY_APPROVED"> & {
  DB?: D1Database;
};

export async function recordAnalyticsAggregate(runtime: AnalyticsEnv, event: AnalyticsEvent, now = new Date()) {
  if (!analyticsWriteReady(runtime) || !runtime.DB) return false;
  const direction = "direction" in event ? event.direction ?? "" : "";
  const source = "source" in event ? event.source : "";
  const contentId = "contentId" in event ? event.contentId : "";
  const depth = "depth" in event ? event.depth : "";
  await incrementAnalyticsDailyCount(runtime.DB, {
    eventDate: now.toISOString().slice(0, 10),
    eventName: event.name,
    direction,
    source,
    contentId,
    depth,
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1_000).toISOString(),
  });
  return true;
}
