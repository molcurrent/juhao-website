import type { ConsultationSource } from "@/lib/consultation";

export const ANALYTICS_PRIVACY_NOTICE_VERSION = "2026-07-22";

export const analyticsEventNames = [
  "consultation_form_view",
  "consultation_form_started",
  "consultation_submit_success",
  "consultation_lead_created",
  "case_detail_view",
  "case_depth_reached",
  "product_detail_view",
  "product_consultation_click",
  "download_requested",
] as const;

export type AnalyticsDirection = "home" | "designer" | "project" | "channel";
export type AnalyticsDepth = "50" | "90";

export type AnalyticsEvent =
  | { name: "consultation_form_view"; source: ConsultationSource; direction?: AnalyticsDirection }
  | { name: "consultation_form_started"; source: ConsultationSource; direction: AnalyticsDirection }
  | { name: "consultation_submit_success"; source: ConsultationSource; direction: AnalyticsDirection }
  | { name: "consultation_lead_created"; source: ConsultationSource; direction: AnalyticsDirection }
  | { name: "case_detail_view"; contentId: string }
  | { name: "case_depth_reached"; contentId: string; depth: AnalyticsDepth }
  | { name: "product_detail_view"; contentId: string }
  | { name: "product_consultation_click"; contentId: string }
  | { name: "download_requested"; contentId: string };

export type ClientAnalyticsEvent = Exclude<AnalyticsEvent, { name: "consultation_lead_created" }>;

export const analyticsKpiDictionary = [
  {
    kpi: "咨询提交率",
    numerator: "consultation_submit_success",
    denominator: "consultation_form_view",
  },
  {
    kpi: "工程询盘",
    numerator: "consultation_lead_created(direction=project)",
    denominator: null,
  },
  {
    kpi: "渠道申请",
    numerator: "consultation_lead_created(direction=channel)",
    denominator: null,
  },
  {
    kpi: "案例深度",
    numerator: "case_depth_reached(depth=90)",
    denominator: "case_detail_view",
  },
  {
    kpi: "产品页转化",
    numerator: "product_consultation_click",
    denominator: "product_detail_view",
  },
  {
    kpi: "下载数量",
    numerator: "download_requested",
    denominator: null,
  },
] as const;
