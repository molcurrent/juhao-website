import Image from "next/image";
import Link from "next/link";
import type { PageData } from "@/app/_data/pages";
import { SemanticPicture } from "@/components/media/SemanticPicture";
import type { BusinessSceneId, SceneResource } from "@/content/scene-resources";
import { consultationHref } from "@/lib/consultation";
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
    <section className={styles.hero} aria-labelledby="business-scene-title">
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
        <p className={styles.eyebrow}><i aria-hidden="true" />{page.eyebrow}</p>
        <h1 id="business-scene-title">{page.title}</h1>
        <p className={styles.heroIntro}>{page.intro}</p>
      </div>
      <p className={styles.heroIndex} aria-hidden="true">JUHAO / LIGHTING</p>
    </section>
  );
}

function SceneNavigation({ sceneId }: { sceneId: BusinessSceneId }) {
  return (
    <nav className={styles.sceneNavigation} aria-label="照明场景分类">
      <div className={styles.sceneNavigationInner}>
        {scenes.map((scene, index) => {
          const active = scene.id === sceneId;
          return (
            <Link
              className={`${styles.sceneLink} ${active ? styles.sceneLinkActive : ""}`}
              href={scene.href}
              aria-current={active ? "page" : undefined}
              key={scene.id}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
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
      <section className={styles.highlights} aria-labelledby="scene-highlights-title">
        <header className={styles.sectionHeading}>
          <p>SCENE FOCUS</p>
          <h2 id="scene-highlights-title">从真实空间出发</h2>
        </header>
        <div className={styles.highlightGrid}>
          {page.highlights.map((item, index) => (
            <article className={styles.highlightCard} key={item.title}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.solutionDetails} aria-label="方案要点">
        {page.sections.map((section, index) => (
          <article className={styles.solutionDetail} key={section.title}>
            <p className={styles.detailNumber}>{String(index + 1).padStart(2, "0")}</p>
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
    <section className={styles.faq} aria-labelledby="scene-faq-title">
      <header className={styles.faqHeading}>
        <p>PLANNING FAQ</p>
        <h2 id="scene-faq-title">方案规划常见问题</h2>
      </header>
      <div className={styles.faqList}>
        {faqs.map((faq, index) => (
          <details className={styles.faqItem} key={faq.question}>
            <summary>
              <small aria-hidden="true">{String(index + 1).padStart(2, "0")}</small>
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
    <section className={styles.products} aria-labelledby="scene-products-title">
      <header className={styles.productsHeading}>
        <div>
          <p>RELATED RESOURCES</p>
          <h2 id="scene-products-title">场景关联资料</h2>
        </div>
        <p>从产品专题、产品资料、项目资料与照明知识继续理解本场景；当前内容用于私有预览，具体适用条件仍以正式资料和项目确认结果为准。</p>
      </header>
      <div className={styles.productState}>
        <div className={styles.productGrid}>
          {resources.map((resource, index) => (
            <Link className={styles.productCard} href={resource.href} key={resource.href} data-resource-kind={resource.kind}>
              <div className={styles.productImage}>
                {resource.mediaId
                  ? <SemanticPicture mediaId={resource.mediaId} alt={resource.title} sizes="(max-width: 760px) 100vw, 25vw" />
                  : <Image src={resource.image} alt={resource.title} fill unoptimized sizes="(max-width: 760px) 100vw, 25vw" />}
              </div>
              <div className={styles.productCopy}>
                <small>{resource.kind} / {resource.detail} / {String(index + 1).padStart(2, "0")}</small>
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
  return (
    <main className={styles.page} id="main-content">
      <SceneHero page={page} />
      <SceneNavigation sceneId={sceneId} />
      <SolutionHighlights page={page} />
      {page.faqs?.length ? <SceneFaq faqs={page.faqs} /> : null}
      <ProductSection resources={resources} />
      <section className={styles.consultationCta} aria-label="场景方案咨询">
        <div><p>PROJECT CONSULTATION</p><h2>把空间条件与项目阶段<br />带进下一步沟通。</h2></div>
        <Link href={consultationHref("project", "solutions", sceneId)}>咨询本场景方案 <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
