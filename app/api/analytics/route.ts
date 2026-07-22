import { env } from "cloudflare:workers";
import { analyticsSettingEnabled, analyticsWriteReady } from "@/lib/analytics/config";
import { isAllowedAnalyticsContentId } from "@/lib/analytics/content-ids";
import { analyticsEventNames, type AnalyticsDirection, type ClientAnalyticsEvent } from "@/lib/analytics/events";
import { consultationSourceValues, type ConsultationSource } from "@/lib/consultation";
import { recordAnalyticsAggregate } from "@/lib/server/analytics";

const MAX_BODY_BYTES = 1_024;
const eventNames = new Set<string>(analyticsEventNames);
const directions = new Set<AnalyticsDirection>(["home", "designer", "project", "channel"]);
const sources = new Set<ConsultationSource>(consultationSourceValues);

function response(status: number) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

function validContentId(eventName: "case_detail_view" | "case_depth_reached" | "product_detail_view" | "product_consultation_click" | "download_requested", value: unknown) {
  return isAllowedAnalyticsContentId(eventName, value);
}

function exactKeys(input: Record<string, unknown>, keys: string[]) {
  const expected = new Set(keys);
  return Object.keys(input).length === expected.size && Object.keys(input).every((key) => expected.has(key));
}

function normalizeEvent(value: unknown): ClientAnalyticsEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const eventName = input.name;
  if (typeof eventName !== "string" || !eventNames.has(eventName)) return null;

  if (eventName === "consultation_form_view") {
    const hasDirection = input.direction !== undefined;
    if (!exactKeys(input, hasDirection ? ["name", "source", "direction"] : ["name", "source"])) return null;
    if (typeof input.source !== "string" || !sources.has(input.source as ConsultationSource)) return null;
    if (hasDirection && (typeof input.direction !== "string" || !directions.has(input.direction as AnalyticsDirection))) return null;
    return {
      name: eventName,
      source: input.source as ConsultationSource,
      ...(hasDirection ? { direction: input.direction as AnalyticsDirection } : {}),
    };
  }

  if (eventName === "consultation_lead_created") return null;

  if (eventName === "consultation_form_started" || eventName === "consultation_submit_success") {
    if (!exactKeys(input, ["name", "source", "direction"])) return null;
    if (typeof input.source !== "string" || !sources.has(input.source as ConsultationSource)) return null;
    if (typeof input.direction !== "string" || !directions.has(input.direction as AnalyticsDirection)) return null;
    return { name: eventName, source: input.source as ConsultationSource, direction: input.direction as AnalyticsDirection };
  }

  if (eventName === "case_depth_reached") {
    if (!exactKeys(input, ["name", "contentId", "depth"]) || !validContentId(eventName, input.contentId)) return null;
    if (input.depth !== "50" && input.depth !== "90") return null;
    return { name: eventName, contentId: input.contentId as string, depth: input.depth };
  }

  if (eventName !== "case_detail_view"
    && eventName !== "product_detail_view"
    && eventName !== "product_consultation_click"
    && eventName !== "download_requested") return null;
  if (!exactKeys(input, ["name", "contentId"]) || !validContentId(eventName, input.contentId)) return null;
  return { name: eventName, contentId: input.contentId as string };
}

export async function POST(request: Request) {
  if (!analyticsSettingEnabled(env.PRIVACY_ANALYTICS_WRITE_ENABLED)) return response(204);
  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) return response(403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return response(415);
  if (!analyticsWriteReady(env) || !env.DB) return response(503);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return response(413);

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return response(413);
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return response(400);
  }
  const event = normalizeEvent(input);
  if (!event) return response(400);

  try {
    await recordAnalyticsAggregate(env, event);
    return response(204);
  } catch {
    return response(503);
  }
}
