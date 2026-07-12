import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "../_components/SiteFooter";
import { SiteHeader } from "../_components/SiteHeader";
import { pages, SITE_URL, type PageData } from "../_data/pages";
import { AboutPage, CareersPage, HistoryPage } from "@/features/about";
import { BusinessScenePage, type BusinessSceneId } from "@/features/business";
import { NewsArticlePage, NewsPage } from "@/features/news/NewsPage";
import { PartnersPage } from "@/features/partners/PartnersPage";
import { ContactPage, MallPage } from "@/features/platform";
import { SearchPage } from "@/features/search/SearchPage";
import { ServicePage } from "@/features/service";
import { SmartHomePage } from "@/features/smart-home";
import { HealthyLightPage, SolutionsOverviewPage } from "@/features/solutions";
import { SustainabilityPage } from "@/features/sustainability/SustainabilityPage";
import { DownloadsPage, LegalPage } from "@/features/utility/UtilityPages";
import { siteApi, type NewsPageResult } from "@/lib/api";
import { resolveConsultationContext, type ConsultationContext } from "@/lib/consultation";
import { NEWS_PAGE_SIZE, newsPagePath, parseNewsPageNumber } from "@/lib/news-pagination";
import { caseStudies, catalogPageData, productTopics } from "@/content/catalog";
import { CasesPage, ProductsPage } from "@/features/catalog/CatalogPages";

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
  if (directPage) return { routeKey: slug.join("/"), page: directPage, canonicalPath: directPage.path, newsPageNumber: null };

  const routeKey = slug.join("/");
  const catalogPage = catalogPageData(routeKey);
  if (catalogPage) return { routeKey, page: catalogPage, canonicalPath: catalogPage.path, newsPageNumber: null };

  const newsPageNumber = parseNewsPageNumber(slug);
  if (newsPageNumber && newsPageNumber >= 2) {
    return { routeKey: "news", page: pages.news, canonicalPath: newsPagePath(newsPageNumber), newsPageNumber };
  }
  return null;
}

const loadNewsPage = cache((page: number) => siteApi.getNewsArticles({ page, pageSize: NEWS_PAGE_SIZE }));

const businessScenes: Record<string, BusinessSceneId> = {
  "solutions/residential": "residential",
  "solutions/hospitality": "hospitality",
  "solutions/commercial": "commercial",
  "solutions/public": "public",
  "solutions/industrial": "industrial",
};

export function generateStaticParams() {
  const pageParams = Object.keys(pages).map((key) => ({ slug: key.split("/") }));
  const catalogParams = [
    ...productTopics.map((item) => ({ slug: ["products", item.slug] })),
    ...caseStudies.map((item) => ({ slug: ["cases", item.slug] })),
  ];
  const newsPageCount = Math.ceil(Object.values(pages).filter((page) => page.type === "article").length / NEWS_PAGE_SIZE);
  const newsParams = Array.from({ length: Math.max(0, newsPageCount - 1) }, (_, index) => ({ slug: ["news", "page", String(index + 2)] }));
  return [...pageParams, ...catalogParams, ...newsParams];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = resolveRoute((await params).slug);
  if (!route) return {};
  const { page, canonicalPath, newsPageNumber } = route;
  const title = newsPageNumber ? `${page.seoTitle}｜第 ${newsPageNumber} 页` : page.seoTitle;
  const description = newsPageNumber ? `${page.description} 当前为第 ${newsPageNumber} 页。` : page.description;
  const socialImage = { url: "/og.png", width: 1733, height: 909, alt: "JUHAO 钜豪照明｜好房子，光健康" };
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
    robots: page.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: page.type === "article"
      ? { ...socialMetadata, type: "article", ...(page.published ? { publishedTime: page.published } : {}) }
      : { ...socialMetadata, type: "website" },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

function GenericPage({ page, breadcrumbs }: { page: PageData; breadcrumbs: { name: string; url: string }[] }) {
  return <main className="innerPage" id="main-content">
    <section className="innerHero" style={{backgroundImage:`linear-gradient(90deg,rgba(7,8,7,.92),rgba(7,8,7,.32)),url(${page.image})`}}>
      <div className="innerGrid"/><div className="innerHeroContent" data-reveal="fade"><nav className="breadcrumbs" aria-label="面包屑">{breadcrumbs.map((item,index)=><span key={item.url}>{index ? " / " : ""}<Link href={item.url.replace(SITE_URL,"") || "/"}>{item.name}</Link></span>)}</nav><p className="eyebrow"><span/>{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p></div>
    </section>
    <section className="contentSection overview"><div className="contentLabel">核心要点</div><div className="highlightGrid">{page.highlights.map((item,index)=><article key={item.title} data-reveal><small>0{index+1}</small><h2>{item.title}</h2><p>{item.text}</p></article>)}</div></section>
    <section className="contentSection articleBody">{page.sections.map((section,index)=><article key={section.title} data-reveal><div className="contentLabel">{String(index+1).padStart(2,"0")}</div><div><h2>{section.title}</h2><p>{section.text}</p>{section.points && <ul>{section.points.map(point=><li key={point}>{point}</li>)}</ul>}</div></article>)}</section>
    {page.faqs && <section className="contentSection faq"><div className="contentLabel">常见问题</div><div><h2>你可能还想了解</h2>{page.faqs.map(faq=><details key={faq.question}><summary>{faq.question}<span>＋</span></summary><p>{faq.answer}</p></details>)}</div></section>}
    <section className="related"><p className="eyebrow"><span/>CONTINUE EXPLORING</p><h2>继续了解钜豪</h2><div className="relatedGrid">{page.related.map(item=><Link href={item.href} key={item.href}><span>{item.label}</span><p>{item.text}</p><b>↗</b></Link>)}</div></section>
    <section className="pageCta"><div><p className="eyebrow"><span/>CREATE WITH LIGHT</p><h2>让光，更适合<br/>真实的空间</h2></div><Link href="/contact">联系方案顾问 <span>→</span></Link></section>
  </main>;
}

function PageFeature({ routeKey, page, breadcrumbs, initialNews, consultationContext }: { routeKey: string; page: PageData; breadcrumbs: { name: string; url: string }[]; initialNews: NewsPageResult; consultationContext: ConsultationContext | null }) {
  if (routeKey === "products") return <ProductsPage page={page} />;
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
  if (sceneId) return <BusinessScenePage page={page} sceneId={sceneId} />;
  if (routeKey === "service") return <ServicePage page={page} />;
  if (routeKey === "sustainability") return <SustainabilityPage page={page} />;
  if (routeKey === "partners") return <PartnersPage page={page} />;
  if (routeKey === "search") return <SearchPage page={page} />;
  if (routeKey === "downloads") return <DownloadsPage page={page} />;
  if (routeKey === "legal" || routeKey === "privacy") return <LegalPage page={page} />;
  if (routeKey === "news") {
    return <NewsPage page={page} initialPage={initialNews} />;
  }
  if (page.type === "article") return <NewsArticlePage page={page} />;
  return <GenericPage page={page} breadcrumbs={breadcrumbs} />;
}

export default async function SeoPage({ params, searchParams }: Props) {
  const slug = (await params).slug;
  const route = resolveRoute(slug);
  if (!route) notFound();
  const { routeKey, page, canonicalPath, newsPageNumber } = route;
  const requestedNewsPage = newsPageNumber ?? 1;
  const consultationContext = routeKey === "contact" ? resolveConsultationContext((await searchParams) ?? {}) : null;
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
    : [{ name: "首页", url: SITE_URL }, ...(page.path.split("/").filter(Boolean).map((segment, index, parts) => {
        const path = `/${parts.slice(0, index + 1).join("/")}`;
        return { name: pages[parts.slice(0, index + 1).join("/")]?.label || segment, url: `${SITE_URL}${path}` };
      }))];
  const schemaName = newsPageNumber ? `${page.title}｜第 ${newsPageNumber} 页` : page.title;
  const schema = page.noindex ? [] : [
    { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:breadcrumbs.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:item.url})) },
    newsPageNumber
      ? { "@context":"https://schema.org", "@type":"CollectionPage", name:schemaName, description:page.description, inLanguage:"zh-CN", url:`${SITE_URL}${canonicalPath}` }
      : page.type === "article"
      ? { "@context":"https://schema.org", "@type":"Article", headline:page.title, description:page.description, image:`${SITE_URL}/og.png`, inLanguage:"zh-CN", datePublished:page.published, dateModified:page.published, mainEntityOfPage:`${SITE_URL}${page.path}`, author:{"@id":`${SITE_URL}/#organization`}, publisher:{"@id":`${SITE_URL}/#organization`} }
      : page.type === "service"
        ? { "@context":"https://schema.org", "@type":"Service", name:page.title, description:page.description, provider:{"@id":`${SITE_URL}/#organization`}, areaServed:"CN" }
        : { "@context":"https://schema.org", "@type":"WebPage", name:page.title, description:page.description, inLanguage:"zh-CN", url:`${SITE_URL}${canonicalPath}` }
  ];
  const faqSchema = !page.noindex && page.faqs?.length ? { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:page.faqs.map((faq)=>({"@type":"Question",name:faq.question,acceptedAnswer:{"@type":"Answer",text:faq.answer}})) } : null;
  const structuredData = [...schema, ...(faqSchema ? [faqSchema] : [])];

  return <>
    <SiteHeader />
    <PageFeature routeKey={routeKey} page={page} breadcrumbs={breadcrumbs} initialNews={initialNews} consultationContext={consultationContext} />
    <SiteFooter />
    {structuredData.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,"\\u003c")}} />}
  </>;
}
