import Image from "next/image";
import Link from "next/link";

import type { PageData } from "@/app/_data/pages";
import { consultationHref } from "@/lib/consultation";

import styles from "./SolutionsPages.module.css";

type PageProps = {
  page: PageData;
};

const solutionScenes = [
  {
    href: "/solutions/residential",
    label: "全屋照明",
    english: "Residential",
    description: "从家庭成员、生活节奏与空间关系出发，组织舒适而清晰的光。",
    image: "/images/juhao-home.webp",
  },
  {
    href: "/solutions/hospitality",
    label: "酒店照明",
    english: "Hospitality",
    description: "串联抵达、停留与休息，让旅居体验自然过渡。",
    image: "/images/juhao-hero.webp",
  },
  {
    href: "/solutions/commercial",
    label: "商业照明",
    english: "Commercial",
    description: "兼顾空间识别、商品呈现与持续运营，让光参与品牌表达。",
    image: "/images/juhao-commercial.webp",
  },
  {
    href: "/solutions/public",
    label: "公共照明",
    english: "Public",
    description: "围绕安全、导向、长期运行与维护条件建立方案。",
    image: "/images/juhao-public.webp",
  },
  {
    href: "/solutions/industrial",
    label: "工业照明",
    english: "Industrial",
    description: "从作业任务、空间条件与维护效率出发规划可见度。",
    image: "/images/juhao-industrial.webp",
  },
] as const;

const solutionSteps = [
  {
    title: "理解使用",
    english: "Observe",
    text: "先看谁在空间里、要完成什么活动，以及视线、动线与停留发生在哪里。",
  },
  {
    title: "组织层次",
    english: "Compose",
    text: "再安排基础光、重点光与氛围光的职责，让亮暗关系服务于空间。",
  },
  {
    title: "选择控制",
    english: "Control",
    text: "把高频场景、分区与运营时段转化成简单、可理解的控制方式。",
  },
  {
    title: "现场复核",
    english: "Review",
    text: "结合安装条件、真实材质与使用反馈复核方案，并保留调整空间。",
  },
] as const;

function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="面包屑">
      <Link href="/">首页</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

function RelatedLinks({
  items,
  title,
  titleId = "solutions-related-title",
}: {
  items: PageData["related"];
  title: string;
  titleId?: string;
}) {
  return (
    <section className={styles.related} aria-labelledby={titleId}>
      <header data-reveal>
        <p className={styles.kicker}>CONTINUE EXPLORING</p>
        <h2 id={titleId}>{title}</h2>
      </header>
      <div className={styles.relatedGrid}>
        {items.map((item, index) => (
          <Link
            href={item.href}
            key={item.href}
            data-reveal
            data-reveal-delay={String(index * 0.06)}
          >
            <small>{String(index + 1).padStart(2, "0")}</small>
            <strong>{item.label}</strong>
            <p>{item.text}</p>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SolutionsOverviewPage({ page }: PageProps) {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.overviewHero} aria-labelledby="solutions-overview-title">
        <div className={styles.overviewHeroCopy} data-reveal>
          <Breadcrumbs current={page.label} />
          <p className={styles.kicker}>{page.eyebrow}</p>
          <h1 id="solutions-overview-title">{page.title}</h1>
          <p className={styles.heroIntro}>{page.intro}</p>
          <Link className={styles.heroLink} href="#solution-scenes">
            浏览空间场景 <span aria-hidden="true">↓</span>
          </Link>
        </div>
        <figure className={styles.overviewHeroVisual} data-reveal="fade">
          <Image
            src="/images/juhao-commercial.webp"
            alt="钜豪商业空间照明氛围"
            fill
            priority
            unoptimized
            sizes="(max-width: 900px) 100vw, 52vw"
          />
          <figcaption>
            <small>JUHAO / SPATIAL LIGHT</small>
            <span>从空间需求开始，而不是从灯具清单开始。</span>
          </figcaption>
        </figure>
      </section>

      <section className={styles.sceneSection} id="solution-scenes" aria-labelledby="solution-scenes-title">
        <header className={styles.sectionHeading} data-reveal>
          <div>
            <p className={styles.kicker}>FIVE SPATIAL SCENES</p>
            <h2 id="solution-scenes-title">按真实场景进入方案</h2>
          </div>
          <p>{page.description}</p>
        </header>
        <nav className={styles.sceneGrid} aria-label="五类照明解决方案">
          {solutionScenes.map((scene, index) => (
            <Link
              className={styles.sceneCard}
              href={scene.href}
              key={scene.href}
              data-reveal
              data-reveal-delay={String(index * 0.05)}
            >
              <div className={styles.sceneImage} aria-hidden="true">
                <Image src={scene.image} alt="" fill unoptimized sizes="(max-width: 680px) 100vw, 34vw" />
              </div>
              <div className={styles.sceneShade} aria-hidden="true" />
              <div className={styles.sceneMeta}>
                <small>{String(index + 1).padStart(2, "0")} / {scene.english}</small>
                <h3>{scene.label}</h3>
                <p>{scene.description}</p>
                <span aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </nav>
      </section>

      <section className={styles.methodSection} aria-labelledby="solution-method-title">
        <header data-reveal>
          <p className={styles.kicker}>HOW WE SHAPE LIGHT</p>
          <h2 id="solution-method-title">一套从使用出发的方案方法</h2>
          <p>{page.sections[0]?.text ?? page.description}</p>
        </header>
        <ol className={styles.methodList}>
          {solutionSteps.map((step, index) => (
            <li key={step.english} data-reveal data-reveal-delay={String(index * 0.06)}>
              <span className={styles.methodNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <small>{step.english}</small>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.solutionCallout} aria-labelledby="solution-callout-title">
        <div data-reveal>
          <p className={styles.kicker}>A CLEAR START</p>
          <h2 id="solution-callout-title">先把需求说清楚，<br />再让光给出答案。</h2>
        </div>
        <div data-reveal data-reveal-delay="0.08">
          <p>{page.sections[1]?.text ?? "方案需要同时回应空间体验、安装条件与长期使用。"}</p>
          <Link href={consultationHref("project", "solutions", "overview")}>提交项目需求 <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <RelatedLinks items={page.related} title="继续进入具体空间" />
    </main>
  );
}

export function HealthyLightPage({ page }: PageProps) {
  const knowledgeLinks: PageData["related"] = [
    {
      href: "/news/blue-light-photobiological-safety",
      label: "蓝光与光生物安全",
      text: "理解通用风险框架、资料边界，以及产品声明为何需要检测依据。",
    },
    {
      href: "/news/glare-control-ugr",
      label: "眩光与防眩",
      text: "从视线、亮度对比与安装条件理解防眩，而不是只看单一参数。",
    },
    {
      href: "/news/bedroom-night-lighting",
      label: "卧室与夜间照明",
      text: "把夜间动线、低亮度活动与直观控制纳入住宅照明规划。",
    },
  ];

  return (
    <main id="main-content" className={`${styles.page} ${styles.healthyPage}`}>
      <section className={styles.healthyHero} aria-labelledby="healthy-light-title">
        <div className={styles.healthyHeroMedia} aria-hidden="true">
          <Image
            src="/images/juhao-home.webp"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
          />
        </div>
        <div className={styles.healthyHeroShade} aria-hidden="true" />
        <div className={styles.healthyHeroContent} data-reveal="fade">
          <Breadcrumbs current={page.label} />
          <p className={styles.kicker}>{page.eyebrow}</p>
          <h1 id="healthy-light-title">{page.title}</h1>
          <p>{page.intro}</p>
        </div>
        <nav className={styles.healthyLocalNav} aria-label="健康光页面导航">
          <a href="#healthy-start">从人开始</a>
          <a href="#healthy-dimensions">四个维度</a>
          <a href="#healthy-boundary">声明边界</a>
        </nav>
      </section>

      <section className={styles.humanStatement} id="healthy-start" aria-labelledby="human-statement-title">
        <div className={styles.statementIndex} aria-hidden="true">01</div>
        <div data-reveal>
          <p className={styles.kicker}>PEOPLE BEFORE PARAMETERS</p>
          <h2 id="human-statement-title">先理解人的活动，<br />再讨论空间里的光。</h2>
        </div>
        <div className={styles.statementCopy} data-reveal data-reveal-delay="0.08">
          <p>{page.sections[0]?.text ?? page.description}</p>
          <p>同一个空间会承载阅读、交流、休息和清洁等不同活动。规划光环境时，需要同时看活动发生的时间、视线方向、停留时长与操作习惯。</p>
        </div>
      </section>

      <section className={styles.dimensionSection} id="healthy-dimensions" aria-labelledby="healthy-dimensions-title">
        <header data-reveal>
          <p className={styles.kicker}>FOUR DIMENSIONS</p>
          <h2 id="healthy-dimensions-title">把抽象的“健康”，<br />还原为可讨论的感受</h2>
        </header>
        <div className={styles.dimensionGrid}>
          {page.highlights.slice(0, 4).map((item, index) => (
            <article key={item.title} data-reveal data-reveal-delay={String(index * 0.07)}>
              <div className={styles.dimensionTopline}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <span aria-hidden="true" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.healthyNarrative} aria-labelledby="healthy-narrative-title">
        <figure data-reveal="fade">
          <Image
            src="/images/juhao-hero.webp"
            alt="具有明暗层次的钜豪家居照明空间"
            fill
            unoptimized
            sizes="(max-width: 900px) 100vw, 48vw"
          />
          <figcaption>让空间在不同活动之间，保留自然的亮暗过渡。</figcaption>
        </figure>
        <div data-reveal>
          <p className={styles.kicker}>LIGHT THROUGH THE DAY</p>
          <h2 id="healthy-narrative-title">光环境不是一个固定场景</h2>
          <p>白天与夜晚、工作与休息，对亮度层次和控制方式的需要并不相同。合理的方案应允许空间随时间和活动调整，同时保留直观的手动控制。</p>
          <ul>
            <li><span>01</span>先确认空间里的主要活动与视觉任务</li>
            <li><span>02</span>识别直视光源、强烈反差与可能的暗区</li>
            <li><span>03</span>用分区和场景控制支持不同时段</li>
            <li><span>04</span>在真实使用中复核并持续调整</li>
          </ul>
        </div>
      </section>

      <section className={styles.boundarySection} id="healthy-boundary" aria-labelledby="healthy-boundary-title">
        <div className={styles.boundaryLabel} data-reveal>
          <span aria-hidden="true" />
          INFORMATION BOUNDARY
        </div>
        <div className={styles.boundaryCopy} data-reveal data-reveal-delay="0.06">
          <h2 id="healthy-boundary-title">不把未经验证的指标，写成健康承诺。</h2>
          <p>{page.sections[1]?.text ?? "产品级声明需要正式检测与企业资料支持。"}</p>
          <div className={styles.boundaryNotice} role="note" aria-label="健康光信息说明">
            <strong>信息说明</strong>
            <p>本页提供通用的光环境规划思路，不构成医学建议，也不代表任何具体产品的光谱、光学或健康性能。具体产品信息应以钜豪正式发布且可核验的资料为准。</p>
          </div>
        </div>
      </section>

      <RelatedLinks
        items={knowledgeLinks}
        title="用已审核知识继续理解健康光"
        titleId="healthy-knowledge-title"
      />

      <RelatedLinks items={page.related} title="把原则带回真实空间" />
    </main>
  );
}
