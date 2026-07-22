import contentAllowlist from "@/content/governance/analytics-content-allowlist.json";

type ContentAnalyticsEventName =
  | "case_detail_view"
  | "case_depth_reached"
  | "product_detail_view"
  | "product_consultation_click"
  | "download_requested";

const caseSourceIds = new Set<string>(contentAllowlist.case_source_ids);
const productSourceIds = new Set<string>(contentAllowlist.product_source_ids);
const approvedDownloadIds = new Set<string>(contentAllowlist.approved_download_ids);

export function isAllowedAnalyticsContentId(eventName: ContentAnalyticsEventName, contentId: unknown) {
  if (typeof contentId !== "string" || contentId.length === 0 || contentId.length > 80) return false;
  if (eventName === "case_detail_view" || eventName === "case_depth_reached") return caseSourceIds.has(contentId);
  if (eventName === "product_detail_view" || eventName === "product_consultation_click") return productSourceIds.has(contentId);
  return approvedDownloadIds.has(contentId);
}
