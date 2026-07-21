import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  publicCatalogIsIndexable,
  publicCatalogItemById,
} from "@/content/public-catalog-v2";
import { PublicCatalogProductPage } from "@/features/catalog-public/PublicCatalogProductPage";

type Props = {
  params: Promise<{ catalogId: string }>;
};

const catalogIdPattern = /^p-[a-z0-9-]{8,80}$/;

async function getCatalogItem(params: Props["params"]) {
  const { catalogId } = await params;
  return catalogIdPattern.test(catalogId)
    ? publicCatalogItemById(catalogId)
    : null;
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getCatalogItem(params);
  if (!item) {
    return {
      title: "产品系列｜钜豪照明",
      robots: { index: false, follow: false, nocache: true },
    };
  }

  const indexable = publicCatalogIsIndexable();
  const title = `${item.title}｜产品系列｜钜豪照明`;
  const description = `${item.title} 的中性产品系列摘要，当前包含 ${item.member_count} 个来源变体记录。`;

  return {
    title,
    description,
    alternates: { canonical: item.canonical_path },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true, nocache: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: item.canonical_path,
      siteName: "钜豪照明 JUHAO",
      locale: "zh_CN",
    },
  };
}

export default async function PublicCatalogDetailRoute({ params }: Props) {
  const item = await getCatalogItem(params);
  if (!item) notFound();

  return (
    <>
      <SiteHeader />
      <PublicCatalogProductPage item={item} />
      <SiteFooter />
    </>
  );
}
