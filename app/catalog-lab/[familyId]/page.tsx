import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  catalogV2DetailById,
  catalogV2FamilyIds,
} from "@/content/catalog-v2.generated";
import { CatalogLabDetail } from "@/features/catalog-lab/CatalogLabDetail";
import { CatalogLabSummaryDetail } from "@/features/catalog-lab/CatalogLabSummaryDetail";

type Props = {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const familyIdPattern = /^family-[a-f0-9]{12}$/;
const catalogReturnOrigin = "https://catalog-return.invalid";
const catalogReturnKeys = [
  "q",
  "category",
  "group",
  "spaces",
  "areas",
  "materials",
  "styles",
  "light_sources",
  "dimensions",
  "page",
  "scope",
] as const;

function safeCatalogReturnHref(
  value: string | string[] | undefined,
  fallback: string,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || candidate.length > 2048) return fallback;
  try {
    const parsed = new URL(candidate, catalogReturnOrigin);
    if (
      parsed.origin !== catalogReturnOrigin ||
      parsed.pathname !== "/catalog-lab" ||
      [...parsed.searchParams.keys()].some(
        (key) =>
          !catalogReturnKeys.includes(
            key as (typeof catalogReturnKeys)[number],
          ),
      )
    ) {
      return fallback;
    }

    const safeParams = new URLSearchParams();
    for (const key of catalogReturnKeys) {
      const values = parsed.searchParams.getAll(key);
      if (values.length > 1) return fallback;
      const parameter = values[0];
      if (parameter === undefined) continue;
      if (
        parameter.length > 200 ||
        /[\u0000-\u001f\u007f<>]/.test(parameter) ||
        (key === "scope" && parameter !== "full") ||
        (key === "group" && !["family", "single"].includes(parameter)) ||
        (key === "page" && !/^[1-9]\d*$/.test(parameter))
      ) {
        return fallback;
      }
      safeParams.set(key, parameter);
    }
    return `/catalog-lab${safeParams.size ? `?${safeParams}` : ""}#catalog-products`;
  } catch {
    return fallback;
  }
}

export const dynamicParams = true;

export function generateStaticParams() {
  return catalogV2FamilyIds.map((familyId) => ({ familyId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { familyId } = await params;
  const detail = familyIdPattern.test(familyId)
    ? await catalogV2DetailById(familyId)
    : null;
  if (!detail) {
    return {
      title: "产品族安全摘要｜产品目录私有审核",
      description: "仅在本地私有审核环境中载入的产品族索引级安全摘要。",
      robots: { index: false, follow: false, nocache: true },
    };
  }
  return {
    title: `${detail.family.title}｜产品目录私有样板`,
    description: `${detail.family.title} 的产品族、变体和来源字段私有预览。`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function CatalogLabDetailRoute({
  params,
  searchParams,
}: Props) {
  const { familyId } = await params;
  if (!familyIdPattern.test(familyId)) notFound();

  const detail = await catalogV2DetailById(familyId);
  const requestedReturnHref = (await searchParams).returnTo;
  const returnHref = safeCatalogReturnHref(
    requestedReturnHref,
    detail
      ? "/catalog-lab#catalog-products"
      : "/catalog-lab?scope=full#catalog-products",
  );
  return (
    <>
      <SiteHeader />
      {detail ? (
        <CatalogLabDetail detail={detail} returnHref={returnHref} />
      ) : (
        <CatalogLabSummaryDetail familyId={familyId} returnHref={returnHref} />
      )}
      <SiteFooter />
    </>
  );
}
