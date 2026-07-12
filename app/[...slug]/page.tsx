import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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

type Props = { params: Promise<{ slug: string[] }> };

function getPage(slug: string[]) { return pages[slug.join("/")]; }

const businessScenes: Record<string, BusinessSceneId> = {
  "solutions/residential": "residential",
  "solutions/hospitality": "hospitality",
  "solutions/commercial": "commercial",
  "solutions/public": "public",
  "solutions/industrial": "industrial",
};

export function generateStaticParams() {
  return Object.keys(pages).map((key) => ({ slug: key.split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  if (!page) return {};
  const socialImage = { url: "/og.png", width: 1733, height: 909, alt: "JUHAO 钜豪照明｜好房子，光健康" };
  const socialMetadata = {
    title: page.seoTitle,
    description: page.description,
    url: page.path,
    siteName: "钜豪照明 JUHAO",
    locale: "zh_CN",
    images: [socialImage],
  };
  return {
    title: page.seoTitle,
    description: page.description,
    alternates: { canonical: page.path },
    robots: page.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: page.type === "article"
      ? { ...socialMetadata, type: "article", ...(page.published ? { publishedTime: page.published } : {}) }
      : { ...socialMetadata, type: "website" },
    twitter: { card: "summary_large_image", title: page.seoTitle, description: page.description, images: ["/og.png"] },
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

function PageFeature({ routeKey, page, breadcrumbs, initialNews }: { routeKey: string; page: PageData; breadcrumbs: { name: string; url: string }[]; initialNews: NewsPageResult }) {
  if (routeKey === "about") return <AboutPage page={page} />;
  if (routeKey === "about/history") return <HistoryPage page={page} />;
  if (routeKey === "about/join") return <CareersPage page={page} />;
  if (routeKey === "solutions") return <SolutionsOverviewPage page={page} />;
  if (routeKey === "healthy-light") return <HealthyLightPage page={page} />;
  if (routeKey === "smart-home") return <SmartHomePage page={page} />;
  if (routeKey === "mall") return <MallPage page={page} />;
  if (routeKey === "contact") return <ContactPage page={page} />;
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

export default async function SeoPage({ params }: Props) {
  const slug = (await params).slug;
  const routeKey = slug.join("/");
  const page = getPage(slug);
  if (!page) notFound();
  const initialNews = routeKey === "news"
    ? await siteApi.getNewsArticles().catch(() => ({ items: [], page: 1, pageSize: 6, total: 0, totalPages: 0 }))
    : { items: [], page: 1, pageSize: 6, total: 0, totalPages: 0 };
  const breadcrumbs = [{ name: "首页", url: SITE_URL }, ...(page.path.split("/").filter(Boolean).map((segment, index, parts) => {
    const path = `/${parts.slice(0, index + 1).join("/")}`;
    return { name: pages[parts.slice(0, index + 1).join("/")]?.label || segment, url: `${SITE_URL}${path}` };
  }))];
  const schema = page.noindex ? [] : [
    { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:breadcrumbs.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:item.url})) },
    page.type === "article"
      ? { "@context":"https://schema.org", "@type":"Article", headline:page.title, description:page.description, image:`${SITE_URL}/og.png`, inLanguage:"zh-CN", datePublished:page.published, dateModified:page.published, mainEntityOfPage:`${SITE_URL}${page.path}`, author:{"@id":`${SITE_URL}/#organization`}, publisher:{"@id":`${SITE_URL}/#organization`} }
      : page.type === "service"
        ? { "@context":"https://schema.org", "@type":"Service", name:page.title, description:page.description, provider:{"@id":`${SITE_URL}/#organization`}, areaServed:"CN" }
        : { "@context":"https://schema.org", "@type":"WebPage", name:page.title, description:page.description, inLanguage:"zh-CN", url:`${SITE_URL}${page.path}` }
  ];
  const faqSchema = !page.noindex && page.faqs?.length ? { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:page.faqs.map((faq)=>({"@type":"Question",name:faq.question,acceptedAnswer:{"@type":"Answer",text:faq.answer}})) } : null;
  const structuredData = [...schema, ...(faqSchema ? [faqSchema] : [])];

  return <>
    <SiteHeader />
    <PageFeature routeKey={routeKey} page={page} breadcrumbs={breadcrumbs} initialNews={initialNews} />
    <SiteFooter />
    {structuredData.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData).replace(/</g,"\\u003c")}} />}
  </>;
}
