import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  catalogV2Index,
  catalogV2Manifest,
} from "@/content/catalog-v2.generated";
import {
  CatalogLabIndex,
  type CatalogLabInitialFilters,
} from "@/features/catalog-lab/CatalogLabIndex";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<SearchParams> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positivePage(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export const metadata: Metadata = {
  title: "产品目录私有样板｜钜豪照明",
  description: "钜豪产品族、变体与跨分类筛选的本地私有样板。",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CatalogLabPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const categories = new Set(
    catalogV2Index.items.map((item) => item.category),
  );
  const requestedScope = first(params.scope) === "full" ? "full" : "sample";
  const requestedCategory = first(params.category) ?? "all";
  const requestedGrouping = first(params.group) ?? "all";
  const initialFilters: CatalogLabInitialFilters = {
    scope: requestedScope,
    query: first(params.q) ?? "",
    category:
      requestedScope === "full" ||
      requestedCategory === "all" ||
      categories.has(requestedCategory)
        ? requestedCategory
        : "all",
    grouping: ["all", "family", "single"].includes(requestedGrouping)
      ? requestedGrouping
      : "all",
    facets: {
      spaces: first(params.spaces) ?? "",
      areas: first(params.areas) ?? "",
      materials: first(params.materials) ?? "",
      styles: first(params.styles) ?? "",
      light_sources: first(params.light_sources) ?? "",
      dimensions: first(params.dimensions) ?? "",
    },
    page: positivePage(first(params.page)),
  };

  return (
    <>
      <SiteHeader />
      <CatalogLabIndex
        items={catalogV2Index.items}
        manifest={catalogV2Manifest}
        initialFilters={initialFilters}
      />
      <SiteFooter />
    </>
  );
}
