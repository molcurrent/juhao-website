import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "../_components/SiteFooter";
import { SiteHeader } from "../_components/SiteHeader";
import { pages, SITE_URL, type PageData } from "../_data/pages";
import { AboutPage, CareersPage, HistoryPage } from "@/features/about";
import { BusinessScenePage, type BusinessSceneId } from "@/features/business";
import { NewsArticlePage } from "@/features/news/NewsArticlePage";
import { NewsPage } from "@/features/news/NewsPage";
import { PartnersPage } from "@/features/partners/PartnersPage";
import { ContactPage, MallPage } from "@/features/platform";
import { SearchPage } from "@/features/search/SearchPage";
import { ServicePage } from "@/features/service";
import { SmartHomePage } from "@/features/smart-home";
import { HealthyLightPage, SolutionsOverviewPage } from "@/features/solutions";
import { SustainabilityPage } from "@/features/sustainability/SustainabilityPage";
import { DownloadsPage, LegalPage } from "@/features/utility/UtilityPages";
import type { NewsPageResult, SearchResult } from "@/lib/api/types";
import { consultationHref, resolveConsultationContext, type ConsultationContext, type ConsultationKind } from "@/lib/consultation";
import { getNewsPage } from "@/lib/news";
import { NEWS_PAGE_SIZE, newsPagePath, parseNewsPageNumber } from "@/lib/news-pagination";
import { caseStudies, catalogPageData, productTopics } from "@/content/catalog";
import { productByRouteKey, productPageData, products } from "@/content/products";
import { CaseDetailPage, CasesPage, ProductsPage, ProductTopicPage } from "@/features/catalog/CatalogPages";
import { ProductDetailPage } from "@/features/catalog/ProductDetailPage";
import { resourcesForScene } from "@/content/scene-resources";
import { searchSite } from "@/content/search-index";
import { isIndexableRoute, isPublishedRoute, publicationRecordByRoute } from "@/content/publication-ledger";
import { routeOgMetadataImage } from "@/lib/media/route-og";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ slug: string[] }>; searchParams?: Promise<SearchParams> };

function getPage(slug: string[]) { return pages[slug.join("/")]; }

type RouteContext = {
  routeKey: string;
  page: PageData;
  canonicalPath: string;
  newsPageNumber: number | null;
};

function resolveRoute(slug: string[]): RouteContext | null {
  const directPage = getPage(slug);
  if (directPage && isPublishedRoute(directPage.path)) return { routeKey: slug.join("/"), page: directPage, canonicalPath: directPage.path, newsPageNumber: null };

  const routeKey = slug.join("/");
  const productPage = productPageData(routeKey);
  if (productPage && isPublishedRoute(productPage.path)) return { routeKey, page: productPage, canonicalPath: productPage.path, newsPageNumber: null };
  const catalogPage = catalogPageData(routeKey);
  if (catalogPage && isPublishedRoute(catalogPage.path)) return { routeKey, page: catalogPage, canonicalPath: catalogPage.path, newsPageNumber: null };

  const newsPageNumber = parseNewsPageNumber(slug);
  if (newsPageNumber && newsPageNumber >= 2 && isPublishedRoute(newsPagePath(newsPageNumber))) {
    return { routeKey: "news", page: pages.news, canonicalPath: newsPagePath(newsPageNumber), newsPageNumber };
  }
  return null;
}

const loadNewsPage = (page: number) => getNewsPage(page, NEWS_PAGE_SIZE);

const businessScenes: Record<string, BusinessSceneId> = {
  "solutions/residential": "residential",
  "solutions/hospitality": "hospitality",
  "solutions/commercial": "commercial",
  "solutions/public": "public",
  "solutions/industrial": "industrial",
};

const supplementalConsultation: Record<string, { kind: ConsultationKind; label: string; title: string; cta: string }> = {
  about: { kind: "project", label: "BRAND TO BRIEF", title: "从了解品牌，进入真实需求。", cta: "提交照明需求" },
  "about/history": { kind: "project", label: "HISTORY TO NOW", title: "以今天的空间问题，继续下一步。", cta: "提交照明需求" },
  "about/join": { kind: "channel", label: "VERIFIED ENTRY", title: "职位未开放，企业协作仍可清晰说明。", cta: "提交企业协作需求" },
  "healthy-light": { kind: "home-health", label: "FROM PRINCIPLE TO HOME", title: "把健康光原则，带回真实生活。", cta: "获取空间建议" },
  sustainability: { kind: "project", label: "FACTS BEFORE CLAIMS", title: "只基于已确认条件讨论项目。", cta: "提交项目需求" },
  downloads: { kind: "project", label: "DOCUMENT REQUEST", title: "暂无核验文件时，先说明资料用途。", cta: "提交资料需求" },
  news: { kind: "project", label: "KNOWLEDGE TO ACTION", title: "把知识问题，转成可讨论的空间条件。", cta: "进入方案咨询" },
  search: { kind: "project", label: "SEARCH TO BRIEF", title: "没有找到答案？说明你的空间问题。", cta: "进入方案咨询" },
  legal: { kind: "project", label: "INFORMATION REVIEW", title: "对当前声明有疑问，可提交具体页面与问题。", cta: "提交信息咨询" },
  privacy: { kind: "project", label: "DATA QUESTION", title: "对咨询数据处理有疑问，可提交具体问题。", cta: "提交信息咨询" },
};

function SupplementalConsultation({ routeKey, canonicalPath }: { routeKey: string; canonicalPath: string }) {
  const item = supplementalConsultation[routeKey];
  if (!item) return null;
  const sourceDetail = canonicalPath.replace(/^\/+|\/+$/g, "").replaceAll("/", "-") || "home";
  return <aside className="supplementalCta" aria-label="本页咨询入口"><div><p>{item.label}</p><h2>{item.title}</h2></div><Link href={consultationHref(item.kind, "page", sourceDetail)}>{item.cta}<span aria-hidden="true">→</span></Link></aside>;
}

export function generateStaticParams() {
  const pageParams = Object.keys(pages).filter((key) => isPublishedRoute(pages[key].path)).map((key) => ({ slug: key.split("/") }));
  const catalogParams = [
    ...productTopics.filter((item) => isPublishedRoute(`/products/${item.slug}`)).map((item) => ({ slug: ["products", item.slug] })),
    ...caseStudies.filter((item) => isPublishedRoute(`/cases/${item.slug}`)).map((item) => ({ slug: ["cases", item.slug] })),
    ...products.filter((item) => isPublishedRoute(item.seo_slug)).map((item) => ({ slug: item.seo_slug.slice(1).split("/") })),
  ];
  const newsPageCount = Math.ceil(Object.values(pages).filter((page) => page.type === "article").length / NEWS_PAGE_SIZE);
  const newsParams = Array.from({ length: Math.max(0, newsPageCount - 1) }, (_, index) => ({ slug: ["news", "page", String(index + 2)] }))
    .filter((item) => isPublishedRoute(`/${item.slug.join("/")}`));
  return [...pageParams, ...catalogParams, ...newsParams];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = resolveRoute((await params).slug);
  if (!route) return {};
  const { page, canonicalPath, newsPageNumber } = route;
  const indexable = isIndexableRoute(canonicalPath);
  const publishedAt = publicationRecordByRoute(canonicalPath)?.published_at || undefined;
  const title = newsPageNumber ? `${page.seoTitle}｜第 ${newsPageNumber} 页` : page.seoTitle;
  const description = newsPageNumber ? `${page.description} 当前为第 ${newsPageNumber} 页。` : page.description;
  const socialImage = routeOgMetadataImage(canonicalPath);
  const socialMetadata = {
    title,
    description,
    url: canonicalPath,
    siteName: "钜豪照明 JUHAO",
    locale: "zh_CN",
    images: [socialImage],
  };
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: page.type === "article"
      ? { ...socialMetadata, type: "article", ...(publishedAt ? { publishedTime: publishedAt } : {}) }
      : { ...socialMetadata, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [socialImage.url] },
  };
}

function GenericPage({ routeKey, page, breadcrumbs }: { routeKey: string; page: PageData; breadcrumbs: { name: string; url: string }[] }) {
  return <main className="innerPage" id="main-content">
    <section className="innerHero">
      <div className="innerHeroMedia"><Image className="innerHeroImage" src={page.image} alt={page.imageAlt ?? `${page.title}主题场景`} width={1672} height={941} sizes="100vw" /></div>
      <div className="innerHeroShade" />
      <div className="innerGrid"/><div className="innerHeroContent" data-reveal="fade"><nav className="breadcrumbs" aria-label="面包屑">{breadcrumbs.map((item,index)=><span key={item.url}>{index ? " / " : ""}<Link href={item.url.replace(SITE_URL,"") || "/"}>{item.name}</Link></span>)}</nav><p className="eyebrow"><span/>{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p></div>
    </section>
    <section className="contentSection overview"><div className="contentLabel">核心要点</div><div className="highlightGrid">{page.highlights.map((item,index)=><article key={item.title} data-reveal><small>0{index+1}</small><h2>{item.title}</h2><p>{item.text}</p></article>)}</div></section>
    <section className="contentSection articleBody">{page.sections.map((section,index)=><article key={section.title} data-reveal><div className="contentLabel">{String(index+1).padStart(2,"0")}</div><div><h2>{section.title}</h2><p>{section.text}</p>{section.points && <ul>{section.points.map(point=><li key={point}>{point}</li>)}</ul>}</div></article>)}</section>
    {page.faqs && <section className="contentSection faq"><div className="contentLabel">常见问题</div><div><h2>你可能还想了解</h2>{page.faqs.map(faq=><details key={faq.question}><summary>{faq.question}<span>＋</span></summary><p>{faq.answer}</p></details>)}</div></section>}
    <section className="related"><p className="eyebrow"><span/>CONTINUE EXPLORING</p><h2>继续了解钜豪</h2><div className="relatedGrid">{page.related.map(item=><Link href={item.href} key={item.href}><span>{item.label}</span><p>{item.text}</p><b>↗</b></Link>)}</div></section>
    <section className="pageCta"><div><p className="eyebrow"><span/>CREATE WITH LIGHT</p><h2>让光，更适合<br/>真实的空间</h2></div><Link href={consultationHref("project", "page", routeKey.replaceAll("/", "-"))}>联系方案顾问 <span>→</span></Link></section>
  </main>;
}

function PageFeature({ routeKey, page, breadcrumbs, initialNews, consultationContext, initialSearchQuery, initialSearchResults }: { routeKey: string; page: PageData; breadcrumbs: { name: string; url: string }[]; initialNews: NewsPageResult; consultationContext: ConsultationContext | null; initialSearchQuery: string; initialSearchResults: SearchResult[] }) {
  if (routeKey === "products") return <ProductsPage page={page} />;
  const product = productByRouteKey(routeKey);
  if (product) return <ProductDetailPage product={product} />;
  const topic = productTopics.find((item) => `products/${item.slug}` === routeKey);
  if (topic) return <ProductTopicPage page={page} topic={topic} />;
  const study = caseStudies.find((item) => `cases/${item.slug}` === routeKey);
  if (study) return <CaseDetailPage study={study} />;
  if (routeKey === "cases") return <CasesPage page={page} />;
  if (routeKey === "about") return <AboutPage page={page} />;
  if (routeKey === "about/history") return <HistoryPage page={page} />;
  if (routeKey === "about/join") return <CareersPage page={page} />;
  if (routeKey === "solutions") return <SolutionsOverviewPage page={page} />;
  if (routeKey === "healthy-light") return <HealthyLightPage page={page} />;
  if (routeKey === "smart-home") return <SmartHomePage page={page} />;
  if (routeKey === "mall") return <MallPage page={page} />;
  if (routeKey === "contact") return <ContactPage page={page} initialContext={consultationContext} />;
  const sceneId = businessScenes[routeKey];
  if (sceneId) return <BusinessScenePage page={page} sceneId={sceneId} resources={resourcesForScene(sceneId)} />;
  if (routeKey === "service") return <ServicePage page={page} />;
  if (routeKey === "sustainability") return <SustainabilityPage page={page} />;
  if (routeKey === "partners") return <PartnersPage page={page} />;
  if (routeKey === "search") return <SearchPage page={page} initialQuery={initialSearchQuery} initialResults={initialSearchResults} />;
  if (routeKey === "downloads") return <DownloadsPage page={page} />;
  if (routeKey === "legal" || routeKey === "privacy") return <LegalPage page={page} />;
  if (routeKey === "news") {
    return <NewsPage page={page} initialPage={initialNews} />;
  }
  if (page.type === "article") return <NewsArticlePage page={page} />;
  return <GenericPage routeKey={routeKey} page={page} breadcrumbs={breadcrumbs} />;
}

function routeBreadcrumbs(page: PageData, canonicalPath: string) {
  const parts = canonicalPath.split("/").filter(Boolean);
  return [
    { name: "首页", url: SITE_URL },
    ...parts.map((segment, index) => {
      const pathParts = parts.slice(0, index + 1);
      const routeKey = pathParts.join("/");
      const path = `/${routeKey}`;
      const topic = routeKey.startsWith("products/")
        ? productTopics.find((item) => `products/${item.slug}` === routeKey)
        : undefined;
      const name = pages[routeKey]?.label ?? topic?.title ?? (index === parts.length - 1 ? page.title : segment);
      return { name, url: `${SITE_URL}${path}` };
    }),
  ];
}

export default async function SeoPage({ params, searchParams }: Props) {
  const slug = (await params).slug;
  const route = resolveRoute(slug);
  if (!route) notFound();
  const { routeKey, page, canonicalPath, newsPageNumber } = route;
  const indexable = isIndexableRoute(canonicalPath);
  const publishedAt = publicationRecordByRoute(canonicalPath)?.published_at || undefined;
  const requestedNewsPage = newsPageNumber ?? 1;
  const resolvedSearchParams: SearchParams = routeKey === "contact" || routeKey === "search" ? (await searchParams) ?? {} : {};
  const consultationContext = routeKey === "contact" ? resolveConsultationContext(resolvedSearchParams) : null;
  const initialSearchQuery = routeKey === "search"
    ? (Array.isArray(resolvedSearchParams.keywords) ? resolvedSearchParams.keywords[0] : resolvedSearchParams.keywords)?.trim() ?? ""
    : "";
  const initialSearchResults = initialSearchQuery ? searchSite(initialSearchQuery) : [];
  let newsLoadFailed = false;
  let initialNews: NewsPageResult = { items: [], page: requestedNewsPage, pageSize: NEWS_PAGE_SIZE, total: 0, totalPages: requestedNewsPage };
  if (routeKey === "news") {
    try {
      initialNews = await loadNewsPage(requestedNewsPage);
    } catch {
      newsLoadFailed = true;
    }
  }
  if (newsPageNumber && !newsLoadFailed && (initialNews.page !== newsPageNumber || newsPageNumber > initialNews.totalPages || initialNews.items.length === 0)) notFound();

  const breadcrumbs = newsPageNumber
    ? [
        { name: "首页", url: SITE_URL },
        { name: pages.news.label, url: `${SITE_URL}/news` },
        { name: `第 ${newsPageNumber} 页`, url: `${SITE_URL}${canonicalPath}` },
      ]
    : routeBreadcrumbs(page, canonicalPath);
  const schemaName = newsPageNumber ? `${page.title}｜第 ${newsPageNumber} 页` : page.title;
  const schema = indexable ? [
    { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:breadcrumbs.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:item.url})) },
    newsPageNumber
      ? { "@context":"https://schema.org", "@type":"CollectionPage", name:schemaName, description:page.description, inLanguage:"zh-CN", url:`${SITE_URL}${canonicalPath}` }
      : page.type === "article"
      ? {
          "@context":"https://schema.org",
          "@type":"Article",
          headline:page.title,
          description:page.description,
          image:`${SITE_URL}${routeOgMetadataImage(canonicalPath).url}`,
          inLanguage:"zh-CN",
          ...(publishedAt ? { datePublished:publishedAt, dateModified:publishedAt } : {}),
          mainEntityOfPage:`${SITE_URL}${page.path}`,
          author:{"@id":`${SITE_URL}/#organization`},
          publisher:{"@id":`${SITE_URL}/#organization`},
        }
      : page.type === "service"
        ? { "@context":"https://schema.org", "@type":"Service", name:page.title, description:page.description, provider:{"@id":`${SITE_URL}/#organization`} }
        : { "@context":"https://schema.org", "@type":"WebPage", name:page.title, description:page.description, inLanguage:"zh-CN", url:`${SITE_URL}${canonicalPath}` }
  ] : [];
  const faqSchema = indexable && page.faqs?.length ? { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:page.faqs.map((faq)=>({"@type":"Question",name:faq.question,acceptedAnswer:{"@type":"Answer",text:faq.answer}})) } : null;
  const structuredData = [...schema, ...(faqSchema ? [faqSchema] : [])];

  return <>
    <SiteHeader />
    <PageFeature routeKey={routeKey} page={page} breadcrumbs={breadcrumbs} initialNews={initialNews} consultationContext={consultationContext} initialSearchQuery={initialSearchQuery} initialSearchResults={initialSearchResults} />
    <SupplementalConsultation routeKey={routeKey} canonicalPath={canonicalPath} />
    <SiteFooter />
    {structuredData.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,"\\u003c")}} />}
  </>;
}
