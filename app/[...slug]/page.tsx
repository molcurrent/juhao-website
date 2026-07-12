import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "../_components/SiteFooter";
import { SiteHeader } from "../_components/SiteHeader";
import { pages, SITE_URL } from "../_data/pages";

type Props = { params: Promise<{ slug: string[] }> };

function getPage(slug: string[]) { return pages[slug.join("/")]; }

export function generateStaticParams() {
  return Object.keys(pages).map((key) => ({ slug: key.split("/") }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: { title: page.seoTitle, description: page.description, url: page.path, type: page.type === "article" ? "article" : "website", images: [{ url: "/og.png", width:1733, height:909, alt:"JUHAO 钜豪照明｜好房子，光健康" }] },
    twitter: { card: "summary_large_image", title: page.seoTitle, description: page.description, images: ["/og.png"] },
  };
}

export default async function SeoPage({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  const breadcrumbs = [{ name: "首页", url: SITE_URL }, ...(page.path.split("/").filter(Boolean).map((segment, index, parts) => {
    const path = `/${parts.slice(0, index + 1).join("/")}`;
    return { name: pages[parts.slice(0, index + 1).join("/")]?.label || segment, url: `${SITE_URL}${path}` };
  }))];
  const schema = [
    { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:breadcrumbs.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:item.url})) },
    page.type === "article" ? { "@context":"https://schema.org", "@type":"Article", headline:page.title, description:page.description, datePublished:page.published, dateModified:page.published, mainEntityOfPage:`${SITE_URL}${page.path}`, author:{"@type":"Organization",name:"钜豪照明"}, publisher:{"@type":"Organization",name:"钜豪照明"} } : page.type === "service" ? { "@context":"https://schema.org", "@type":"Service", name:page.title, description:page.description, provider:{"@type":"Organization",name:"钜豪照明",url:SITE_URL}, areaServed:"CN" } : { "@context":"https://schema.org", "@type":"WebPage", name:page.title, description:page.description, url:`${SITE_URL}${page.path}` }
  ];
  const faqSchema = page.faqs ? { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:page.faqs.map((faq)=>({"@type":"Question",name:faq.question,acceptedAnswer:{"@type":"Answer",text:faq.answer}})) } : null;

  return <>
    <SiteHeader />
    <main className="innerPage" id="main-content">
      <section className="innerHero" style={{backgroundImage:`linear-gradient(90deg,rgba(7,8,7,.92),rgba(7,8,7,.32)),url(${page.image})`}}>
        <div className="innerGrid"/><div className="innerHeroContent"><nav className="breadcrumbs" aria-label="面包屑">{breadcrumbs.map((item,index)=><span key={item.url}>{index ? " / " : ""}<a href={item.url.replace(SITE_URL,"") || "/"}>{item.name}</a></span>)}</nav><p className="eyebrow"><span/>{page.eyebrow}</p><h1>{page.title}</h1><p>{page.intro}</p></div>
      </section>
      <section className="contentSection overview"><div className="contentLabel">核心要点</div><div className="highlightGrid">{page.highlights.map((item,index)=><article key={item.title}><small>0{index+1}</small><h2>{item.title}</h2><p>{item.text}</p></article>)}</div></section>
      <section className="contentSection articleBody">{page.sections.map((section,index)=><article key={section.title}><div className="contentLabel">{String(index+1).padStart(2,"0")}</div><div><h2>{section.title}</h2><p>{section.text}</p>{section.points && <ul>{section.points.map(point=><li key={point}>{point}</li>)}</ul>}</div></article>)}</section>
      {page.faqs && <section className="contentSection faq"><div className="contentLabel">常见问题</div><div><h2>你可能还想了解</h2>{page.faqs.map(faq=><details key={faq.question}><summary>{faq.question}<span>＋</span></summary><p>{faq.answer}</p></details>)}</div></section>}
      <section className="related"><p className="eyebrow"><span/>CONTINUE EXPLORING</p><h2>继续了解钜豪</h2><div className="relatedGrid">{page.related.map(item=><a href={item.href} key={item.href}><span>{item.label}</span><p>{item.text}</p><b>↗</b></a>)}</div></section>
      <section className="pageCta"><div><p className="eyebrow"><span/>CREATE WITH LIGHT</p><h2>让光，更适合<br/>真实的空间</h2></div><a href="/contact">联系方案顾问 <span>→</span></a></section>
    </main>
    <SiteFooter />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify([...schema,...(faqSchema?[faqSchema]:[])]).replace(/</g,"\\u003c")}} />
  </>;
}
