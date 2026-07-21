import Image from "next/image";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { EvidenceScale, type EvidenceScaleItem } from "@/components/experience/EvidenceScale";
import { SemanticPicture } from "@/components/media/SemanticPicture";
import type { BusinessSceneId, SceneResource } from "@/content/scene-resources";
import { consultationHref } from "@/lib/consultation";
import { RelightingTheatre } from "./RelightingTheatre";
import styles from "./BusinessScenePage.module.css";

export type { BusinessSceneId } from "@/content/scene-resources";

export type BusinessScenePageProps = {
  page: PageData;
  sceneId: BusinessSceneId;
  resources: SceneResource[];
};

const scenes: { id: BusinessSceneId; label: string; href: string }[] = [
  { id: "residential", label: "全屋照明", href: "/solutions/residential" },
  { id: "hospitality", label: "酒店照明", href: "/solutions/hospitality" },
  { id: "commercial", label: "商业照明", href: "/solutions/commercial" },
  { id: "public", label: "公共照明", href: "/solutions/public" },
  { id: "industrial", label: "工业照明", href: "/solutions/industrial" },
];

function SceneHero({ page }: { page: PageData }) {
  return (
    <section className={styles.hero} data-header-tone="light" data-page-hero="image" aria-labelledby="business-scene-title">
      <div className={styles.heroMedia} aria-hidden="true">
        <Image src={page.image} alt="" fill priority unoptimized sizes="100vw" />
      </div>
      <div className={styles.heroShade} />
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroContent}>
        <nav className={styles.breadcrumbs} aria-label="面包屑">
          <Link href="/">首页</Link>
          <span aria-hidden="true">/</span>
          <Link href="/solutions">照明解决方案</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{page.label}</span>
        </nav>
        <p className={styles.eyebrow} data-page-role="eyebrow"><i aria-hidden="true" />{page.eyebrow}</p>
        <h1 id="business-scene-title" data-page-role="display">{page.title}</h1>
        <p className={styles.heroIntro} data-page-role="lead">{page.intro}</p>
      </div>
      <p className={styles.heroIndex} aria-hidden="true">JUHAO / LIGHTING</p>
    </section>
  );
}

function SceneNavigation({ sceneId }: { sceneId: BusinessSceneId }) {
  return (
    <nav className={styles.sceneNavigation} data-header-tone="dark" aria-label="照明场景分类">
      <div className={styles.sceneNavigationInner}>
        {scenes.map((scene) => {
          const active = scene.id === sceneId;
          return (
            <Link
              className={`${styles.sceneLink} ${active ? styles.sceneLinkActive : ""}`}
              href={scene.href}
              aria-current={active ? "page" : undefined}
              key={scene.id}
            >
              <span>{scene.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SolutionHighlights({ page }: { page: PageData }) {
  return (
    <>
      <section className={styles.highlights} data-header-tone="dark" aria-labelledby="scene-highlights-title">
        <header className={styles.sectionHeading}>
          <p>场景重点</p>
          <h2 id="scene-highlights-title">从真实空间出发</h2>
        </header>
        <div className={styles.highlightGrid}>
          {page.highlights.map((item, index) => (
            <article className={styles.highlightCard} key={item.title} data-reveal data-reveal-delay={String(index * 0.05)}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.solutionDetails} data-header-tone="dark" aria-label="方案要点">
        {page.sections.map((section) => (
          <article className={styles.solutionDetail} key={section.title} data-reveal>
            <div>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
              {section.points && (
                <ul>
                  {section.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function SceneFaq({ faqs }: { faqs: NonNullable<PageData["faqs"]> }) {
  return (
    <section className={styles.faq} data-header-tone="dark" aria-labelledby="scene-faq-title">
      <header className={styles.faqHeading}>
        <p>规划问答</p>
        <h2 id="scene-faq-title">方案规划常见问题</h2>
      </header>
      <div className={styles.faqList}>
        {faqs.map((faq) => (
          <details className={styles.faqItem} key={faq.question}>
            <summary>
              <span>{faq.question}</span>
              <i className={styles.faqToggle} aria-hidden="true" />
            </summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function ProductSection({ resources }: { resources: SceneResource[] }) {
  return (
    <section className={styles.products} data-header-tone="light" aria-labelledby="scene-products-title">
      <header className={styles.productsHeading}>
        <div>
          <p>相关资料</p>
          <h2 id="scene-products-title">场景关联资料</h2>
        </div>
        <p>从钜豪产品专题、产品资料与项目资料继续理解本场景；当前内容用于私有预览，具体适用条件仍以正式资料和项目确认结果为准。</p>
      </header>
      <div className={styles.productState}>
        <div className={styles.productGrid}>
          {resources.map((resource, index) => (
            <Link className={styles.productCard} href={resource.href} key={resource.href} data-resource-kind={resource.kind} data-reveal data-reveal-delay={String(index * 0.05)}>
              <div className={styles.productImage}>
                {resource.kind === "产品专题"
                  ? <div className={styles.topicResourceVisual} aria-hidden="true"><small>SCENE INDEX</small><strong>{resource.detail}</strong><span>JUHAO / LIGHTING SYSTEM</span></div>
                  : resource.mediaId
                  ? <SemanticPicture mediaId={resource.mediaId} alt={resource.title} sizes="(max-width: 760px) 100vw, 25vw" />
                  : <Image src={resource.image} alt={resource.title} fill unoptimized sizes="(max-width: 760px) 100vw, 25vw" />}
              </div>
              <div className={styles.productCopy}>
                <small>{resource.kind} / {resource.detail}</small>
                <h3>{resource.title}</h3>
                <p>{resource.summary}</p>
                <span className={styles.resourceAction}>查看内容 <b aria-hidden="true">↗</b></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BusinessScenePage({ page, sceneId, resources }: BusinessScenePageProps) {
  const consultationLink = consultationHref("project", "solutions", sceneId);
  const theatreImage = resources.find((resource) => resource.kind === "产品专题")?.image ?? page.image;
  const hasProjectEvidence = resources.some((resource) => resource.kind === "项目资料");
  const evidenceItems: EvidenceScaleItem[] = [
    { code: "01", title: "空间场景", value: page.label, status: "confirmed" },
    { code: "02", title: "活动任务", value: `${page.highlights.length} 个场景重点`, status: "context" },
    { code: "03", title: "方案方法", value: `${page.sections.length} 组规划要点`, status: "context" },
    { code: "04", title: "项目证据", value: hasProjectEvidence ? "已关联匹配项目资料" : "匹配项目资料待补", status: hasProjectEvidence ? "confirmed" : "pending" },
    { code: "05", title: "下一步", value: "带本场景进入咨询", status: "action", href: consultationLink },
  ];
  return (
    <main className={styles.page} data-lightfield-page="solution" id="main-content" tabIndex={-1}>
      <SceneHero page={page} />
      <SceneNavigation sceneId={sceneId} />
      <EvidenceScale items={evidenceItems} label="场景决策证据刻度" />
      <RelightingTheatre image={theatreImage} sceneId={sceneId} />
      <SolutionHighlights page={page} />
      {page.faqs?.length ? <SceneFaq faqs={page.faqs} /> : null}
      <ProductSection resources={resources} />
      <section className={styles.consultationCta} aria-label="场景方案咨询">
        <div><p>项目咨询</p><h2>把空间条件与项目阶段<br />带进下一步沟通。</h2></div>
        <Link href={consultationLink}>咨询本场景方案 <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
