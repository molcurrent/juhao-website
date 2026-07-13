import type { ContactRequest } from "@/lib/api/types";

export type ConsultationKind = "home-health" | "project" | "channel";

export type ConsultationSource = ContactRequest["source"];

export const CONSULTATION_PRIVACY_VERSION = "2026-07-13";

export type ConsultationOption = {
  kind: ConsultationKind;
  label: string;
  cta: string;
  description: string;
  direction: ContactRequest["direction"];
  scene: ContactRequest["scene"];
  intent: ContactRequest["intent"];
  projectPlaceholder: string;
  needPlaceholder: string;
};

export type ConsultationContext = ConsultationOption & {
  source: ConsultationSource;
  sourceDetail?: string;
};

export const consultationOptions: readonly ConsultationOption[] = [
  {
    kind: "home-health",
    label: "家庭健康光",
    cta: "获取户型 / 空间建议",
    description: "说明户型、家庭活动与当前光环境，获取分区和场景规划建议。",
    direction: "home",
    scene: "home-health",
    intent: "space-advice",
    projectPlaceholder: "例如：80㎡三居，准备改造客餐厅照明",
    needPlaceholder: "说明家庭成员、主要活动、现有光环境和希望改善的空间。",
  },
  {
    kind: "project",
    label: "工程项目",
    cta: "提交项目需求",
    description: "提供项目类型、规模和当前阶段，梳理方案、交付与协作重点。",
    direction: "project",
    scene: "project",
    intent: "project-brief",
    projectPlaceholder: "例如：1200㎡商业空间，处于方案设计阶段",
    needPlaceholder: "说明项目类型、面积、时间节点、图纸状态和需要协同的问题。",
  },
  {
    kind: "channel",
    label: "渠道合作",
    cta: "了解合作条件",
    description: "介绍所在区域、业务基础与合作方向，便于开展针对性沟通。",
    direction: "channel",
    scene: "channel",
    intent: "partnership",
    projectPlaceholder: "例如：佛山灯饰门店，关注全屋与智能产品合作",
    needPlaceholder: "说明所在区域、现有业务、目标客户和希望了解的合作方向。",
  },
] as const;

const sources = new Set<ConsultationSource>([
  "home-hero",
  "home-platform",
  "home-contact",
  "floating",
  "footer",
  "header",
  "mobile-nav",
  "products",
  "product-topic",
  "product-detail",
  "cases",
  "case-detail",
  "solutions",
  "partners",
  "service-network",
  "mall",
  "direct",
]);

const detailSources = new Set<ConsultationSource>(["product-topic", "product-detail", "case-detail", "solutions", "partners"]);

export const consultationSourceValues = [...sources];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanSourceDetail(value: string | string[] | undefined) {
  const detail = first(value);
  return detail && /^[a-z0-9-]{1,80}$/i.test(detail) ? detail : undefined;
}

export function consultationHref(kind: ConsultationKind, source: ConsultationSource, sourceDetail?: string) {
  const option = consultationOptions.find((item) => item.kind === kind);
  if (!option) return "/contact#consultation-form";
  const params = new URLSearchParams({ source, scene: option.scene, intent: option.intent });
  const detail = detailSources.has(source) ? cleanSourceDetail(sourceDetail) : undefined;
  if (detail) params.set("sourceDetail", detail);
  return `/contact?${params.toString()}#consultation-form`;
}

export function resolveConsultationContext(input: Record<string, string | string[] | undefined>): ConsultationContext | null {
  const scene = first(input.scene);
  const intent = first(input.intent);
  const option = consultationOptions.find((item) => item.scene === scene && item.intent === intent);
  if (!option) return null;
  const sourceValue = first(input.source) as ConsultationSource | undefined;
  const source = sourceValue && sources.has(sourceValue) ? sourceValue : "direct";
  const sourceDetail = detailSources.has(source) ? cleanSourceDetail(input.sourceDetail) : undefined;
  return { ...option, source, ...(sourceDetail ? { sourceDetail } : {}) };
}

export function consultationContextForDirection(direction: ContactRequest["direction"], source: ConsultationSource = "direct", sourceDetail?: string) {
  const option = consultationOptions.find((item) => item.direction === direction) ?? consultationOptions[1];
  const detail = detailSources.has(source) ? cleanSourceDetail(sourceDetail) : undefined;
  return { ...option, source, ...(detail ? { sourceDetail: detail } : {}) } satisfies ConsultationContext;
}
