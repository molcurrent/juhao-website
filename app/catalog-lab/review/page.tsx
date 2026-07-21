import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import rawDecisionLedger from "@/content/governance/product-catalog-v2-family-decisions.json";
import rawPilotCandidates from "@/content/governance/product-catalog-v2-public-pilot-candidates.json";
import rawReviewWorkbench from "@/content/governance/product-catalog-v2-review-workbench.json";
import {
  CatalogReviewWorkbench,
  type CatalogDecisionLedger,
  type CatalogPilotCandidates,
  type CatalogReviewWorkbenchData,
} from "@/features/catalog-lab/CatalogReviewWorkbench";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "产品目录人工审核台｜钜豪照明内部预览",
  description: "钜豪产品族、分类异常与首批发布候选的本地人工审核工具。",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default function CatalogReviewPage() {
  const enabled =
    process.env.NODE_ENV !== "production" ||
    process.env.CATALOG_REVIEW_WORKBENCH_ENABLED === "true";
  if (!enabled) notFound();

  return (
    <>
      <SiteHeader />
      <CatalogReviewWorkbench
        workbench={rawReviewWorkbench as CatalogReviewWorkbenchData}
        pilot={rawPilotCandidates as unknown as CatalogPilotCandidates}
        decisionLedger={rawDecisionLedger as CatalogDecisionLedger}
      />
      <SiteFooter />
    </>
  );
}
