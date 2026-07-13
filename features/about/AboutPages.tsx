import Image from "next/image";
import Link from "next/link";

import type { PageData } from "@/app/_data/pages";
import { AccessibleCarousel } from "@/components/ui/AccessibleCarousel";

import styles from "./AboutPages.module.css";

type PageProps = {
  page: PageData;
};

const ownedImages = new Set([
  "/images/juhao-home.webp",
  "/images/juhao-industrial.webp",
  "/images/juhao-commercial.webp",
]);

const brandStories = [
  {
    eyebrow: "HUMAN FIRST",
    title: "先理解人，再设计光",
    text: "从阅读、休息、交流与通行等真实活动出发，让亮度、层次与控制方式服务于人的感受。",
    image: "/images/juhao-home.webp",
    alt: "温暖有层次的钜豪家居照明空间",
    href: "/healthy-light",
    linkLabel: "了解健康光环境",
  },
  {
    eyebrow: "SPACE IN CONTEXT",
    title: "让每一种空间，有自己的光",
    text: "住宅、酒店、商业与公共空间承担不同任务，方案需要回应尺度、材质、动线与使用节奏。",
    image: "/images/juhao-commercial.webp",
    alt: "强调材质和动线的钜豪商业照明空间",
    href: "/solutions",
    linkLabel: "查看空间解决方案",
  },
  {
    eyebrow: "BUILT TO LAST",
    title: "把长期使用，放进设计里",
    text: "从维护条件、控制分区到运行效率，在方案阶段就考虑安装之后的稳定使用与持续调整。",
    image: "/images/juhao-industrial.webp",
    alt: "面向长期运行的钜豪工业照明空间",
    href: "/solutions/industrial",
    linkLabel: "了解工业照明",
  },
] as const;

const historyEvents = [
  { year: "2020", title: "区域渠道战略持续推进", text: "钜豪照明召开华东地区优秀经销商会议，围绕区域协同与后续发展战略展开沟通。", source: "企业资料 #149" },
  { year: "2021", title: "钜豪智慧家庭正式发布", text: "钜豪在集团总部举行智慧家庭发布会，公开面向全屋智能与照明协同的发展方向。", source: "企业资料 #160" },
  { year: "2024", title: "春季优秀经销商会", text: "全国经销商伙伴在钜豪工业园交流年度战略、产品与渠道协同。", source: "企业资料 #192" },
  { year: "2025", title: "春季新品订货会", text: "钜豪发布年度产品与发展方向，并与全国经销商共同讨论照明行业趋势。", source: "企业资料 #205" },
  { year: "2026", title: "优秀经销商盛典与新品品鉴", text: "钜豪与全国经销商伙伴继续推进新品、工程与渠道合作。", source: "企业资料 #224" },
] as const;

const brandHonors = [
  { year: "2019", title: "行业领袖品牌", source: "企业资料 #25" },
  { year: "2021", title: "智能照明年度影响力品牌创新奖", source: "企业资料 #167" },
  { year: "2026", title: "工程照明品牌 TOP10", source: "企业资料 #223" },
  { year: "2026", title: "设计师推荐品牌 TOP10", source: "企业资料 #223" },
  { year: "2026", title: "中国智慧道路照明大会优秀合作伙伴", source: "企业资料 #225" },
] as const;

function safeImage(page: PageData, fallback: string) {
  return ownedImages.has(page.image) ? page.image : fallback;
}

function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="面包屑">
      <Link href="/">首页</Link>
      <span aria-hidden="true">/</span>
      {current === "关于钜豪" ? (
        <span aria-current="page">{current}</span>
      ) : (
        <>
          <Link href="/about">关于钜豪</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{current}</span>
        </>
      )}
    </nav>
  );
}

function AboutNavigation({ active }: { active: "about" | "history" | "careers" }) {
  const items = [
    { key: "about", label: "品牌介绍", href: "/about" },
    { key: "history", label: "发展历程", href: "/about/history" },
    { key: "careers", label: "加入钜豪", href: "/about/join" },
  ] as const;

  return (
    <nav className={styles.localNav} aria-label="关于钜豪页面导航">
      {items.map((item, index) => (
        <Link
          href={item.href}
          key={item.key}
          aria-current={active === item.key ? "page" : undefined}
          className={active === item.key ? styles.localNavActive : undefined}
        >
          <small>{String(index + 1).padStart(2, "0")}</small>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function RelatedLinks({ items }: { items: PageData["related"] }) {
  return (
    <section className={styles.related} aria-labelledby="about-related-title">
      <div data-reveal>
        <p className={styles.kicker}>CONTINUE EXPLORING</p>
        <h2 id="about-related-title">继续了解钜豪</h2>
      </div>
      <div className={styles.relatedGrid}>
        {items.map((item, index) => (
          <Link href={item.href} key={item.href} data-reveal data-reveal-delay={String(index * 0.06)}>
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

export function AboutPage({ page }: PageProps) {
  return (
    <main id="main-content" className={styles.featurePage}>
      <section className={styles.aboutHero} aria-labelledby="about-title">
        <div className={styles.aboutHeroCopy} data-reveal>
          <Breadcrumbs current={page.label} />
          <p className={styles.kicker}>{page.eyebrow}</p>
          <h1 id="about-title">{page.title}</h1>
          <p className={styles.heroIntro}>{page.intro}</p>
          <div className={styles.heroMark} aria-hidden="true">
            <span>JUHAO</span>
            <b>LIGHT / LIFE</b>
          </div>
        </div>
        <figure className={styles.aboutHeroVisual} data-reveal="fade">
          <Image
            src={safeImage(page, "/images/juhao-home.webp")}
            alt="钜豪家居照明空间"
            fill
            priority
            unoptimized
            sizes="(max-width: 900px) 100vw, 50vw"
          />
          <figcaption>以人的真实感受，重新理解空间里的光。</figcaption>
        </figure>
      </section>

      <AboutNavigation active="about" />

      <section className={styles.brandStatement} aria-labelledby="brand-statement-title">
        <div className={styles.sectionIndex} aria-hidden="true">01</div>
        <div data-reveal>
          <p className={styles.kicker}>OUR POINT OF VIEW</p>
          <h2 id="brand-statement-title">好房子，<em>光健康。</em></h2>
        </div>
        <p data-reveal data-reveal-delay="0.08">{page.sections[0]?.text ?? page.description}</p>
      </section>

      <section className={styles.capabilities} aria-labelledby="capabilities-title">
        <header data-reveal>
          <p className={styles.kicker}>WHAT WE CARE ABOUT</p>
          <h2 id="capabilities-title">从一束光，抵达完整的人居体验</h2>
        </header>
        <div className={styles.capabilityGrid}>
          {page.highlights.map((item, index) => (
            <article key={item.title} data-reveal data-reveal-delay={String(index * 0.06)}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <i aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className={styles.brandCarouselSection} aria-labelledby="brand-carousel-title">
        <header data-reveal>
          <div>
            <p className={styles.kicker}>LIGHT IN REAL LIFE</p>
            <h2 id="brand-carousel-title">让品牌观点，进入真实场景</h2>
          </div>
          <p>用三组空间叙事说明钜豪如何理解人、空间与长期使用。可使用方向键、触摸滑动或下方按钮浏览。</p>
        </header>
        <AccessibleCarousel
          ariaLabel="钜豪品牌场景轮播"
          className={styles.brandCarousel}
          autoPlay
          autoPlayInterval={6000}
        >
          {brandStories.map((story, index) => (
            <article className={styles.brandSlide} key={story.title}>
              <figure className={styles.brandSlideVisual}>
                <Image
                  className={styles.brandSlideImage}
                  src={story.image}
                  alt={story.alt}
                  fill
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 62vw"
                />
                <figcaption>{String(index + 1).padStart(2, "0")} / {story.eyebrow}</figcaption>
              </figure>
              <div className={styles.brandSlideCopy}>
                <small>{story.eyebrow}</small>
                <h3>{story.title}</h3>
                <p>{story.text}</p>
                <Link href={story.href}>{story.linkLabel}<span aria-hidden="true">→</span></Link>
              </div>
            </article>
          ))}
        </AccessibleCarousel>
      </section>

      {page.sections.slice(1).map((section, index) => (
        <section className={styles.aboutDetail} key={section.title} aria-labelledby={`about-detail-${index}`}>
          <div className={styles.detailImage} data-reveal="fade">
            <Image
              src="/images/juhao-commercial.webp"
              alt="钜豪商业照明空间"
              fill
              unoptimized
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          </div>
          <div data-reveal>
            <p className={styles.kicker}>HOW WE WORK</p>
            <h2 id={`about-detail-${index}`}>{section.title}</h2>
            <p>{section.text}</p>
            {section.points && (
              <ul>
                {section.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            )}
          </div>
        </section>
      ))}

      <RelatedLinks items={page.related} />
    </main>
  );
}

export function HistoryPage({ page }: PageProps) {
  return (
    <main id="main-content" className={`${styles.featurePage} ${styles.historyPage}`}>
      <section className={styles.historyHero} aria-labelledby="history-title">
        <div className={styles.historyImage} aria-hidden="true">
          <Image
            src={safeImage(page, "/images/juhao-industrial.webp")}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
          />
        </div>
        <div className={styles.historyHeroContent} data-reveal="fade">
          <Breadcrumbs current={page.label} />
          <p className={styles.kicker}>{page.eyebrow}</p>
          <h1 id="history-title">{page.title}</h1>
          <p>{page.intro}</p>
          <div className={styles.verificationBadge} role="status">
            <span aria-hidden="true" />
            企业知识库公司新闻已核验
          </div>
        </div>
      </section>

      <AboutNavigation active="history" />

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <header data-reveal>
          <p className={styles.kicker}>VERIFIED COMPANY ARCHIVE</p>
          <h2 id="timeline-title">公开发展节点</h2>
          <p>以下节点依据企业知识库公司新闻整理，不使用无法追溯的成立时间、规模或门店数字。</p>
        </header>
        <ol className={styles.timeline}>
          {historyEvents.map((item, index) => (
            <li key={item.year} data-reveal data-reveal-delay={String(index * 0.08)}>
              <div className={styles.timelineRail} aria-hidden="true"><span /></div>
              <div className={styles.timelineWhen}>{item.year}</div>
              <article>
                <small>ARCHIVE {String(index + 1).padStart(2, "0")}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className={styles.itemStatus}>{item.source}</span>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.honorsSection} aria-labelledby="honors-title">
        <header><p className={styles.kicker}>BRAND HONORS</p><h2 id="honors-title">品牌荣誉</h2><span>仅列出已有企业新闻记录的荣誉，不延伸未核实的行业排名或宣传口径。</span></header>
        <div>{brandHonors.map((honor) => <article key={`${honor.year}-${honor.title}`}><small>{honor.year}</small><h3>{honor.title}</h3><p>{honor.source}</p></article>)}</div>
      </section>

      <section className={styles.archivePolicy} aria-labelledby="archive-policy-title">
        <div data-reveal>
          <p className={styles.kicker}>PUBLISHING RULE</p>
          <h2 id="archive-policy-title">只记录可追溯的品牌节点</h2>
        </div>
        <div className={styles.archivePolicyCopy} data-reveal>
          {page.sections.map((section) => (
            <article key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </article>
          ))}
          <p className={styles.noIndexNote}>成立年份、生产规模与门店数量等口径仍需企业档案单独确认。</p>
        </div>
      </section>

      <RelatedLinks items={page.related} />
    </main>
  );
}

export function CareersPage({ page }: PageProps) {
  return (
    <main id="main-content" className={styles.featurePage} data-page-noindex={page.noindex || undefined}>
      <section className={styles.careersHero} aria-labelledby="careers-title">
        <div className={styles.careersHeroMedia} data-reveal="fade">
          <Image
            src={safeImage(page, "/images/juhao-commercial.webp")}
            alt="钜豪商业照明与空间协作场景"
            fill
            priority
            unoptimized
            sizes="(max-width: 900px) 100vw, 44vw"
          />
        </div>
        <div className={styles.careersHeroCopy} data-reveal>
          <Breadcrumbs current={page.label} />
          <p className={styles.kicker}>{page.eyebrow}</p>
          <h1 id="careers-title">{page.title}</h1>
          <p>{page.intro}</p>
          <div className={styles.openingStatus} role="status">
            <small>OPEN POSITIONS</small>
            <strong>当前无已核验职位</strong>
            <span>申请入口将在企业确认职位信息后开放</span>
          </div>
        </div>
      </section>

      <AboutNavigation active="careers" />

      <section className={styles.talentAreas} aria-labelledby="talent-title">
        <header data-reveal>
          <p className={styles.kicker}>TALENT AREAS</p>
          <h2 id="talent-title">人才领域</h2>
          <p>这里展示长期关注的协作方向，不代表正在招聘的岗位。</p>
        </header>
        <div className={styles.talentGrid}>
          {page.highlights.map((item, index) => (
            <article key={item.title} data-reveal data-reveal-delay={String(index * 0.06)}>
              <span aria-hidden="true">0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.releaseRules} aria-labelledby="release-rules-title">
        <div data-reveal>
          <p className={styles.kicker}>CLEAR BEFORE OPEN</p>
          <h2 id="release-rules-title">每一个入口开放前，信息必须完整</h2>
        </div>
        <div className={styles.releaseRulesBody} data-reveal>
          {page.sections.map((section) => (
            <div key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.text}</p>
            </div>
          ))}
          <ul aria-label="职位发布信息要求">
            <li><span>01</span>职责范围</li>
            <li><span>02</span>任职要求</li>
            <li><span>03</span>工作地点</li>
            <li><span>04</span>有效期限</li>
          </ul>
        </div>
      </section>

      <section className={styles.careersClosing} aria-labelledby="careers-closing-title">
        <div data-reveal>
          <p className={styles.kicker}>ENTRY STATUS</p>
          <h2 id="careers-closing-title">宁可暂不发布，<br />也不让模糊信息成为承诺。</h2>
        </div>
        <Link href="/news" data-reveal>
          先了解钜豪动态
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <RelatedLinks items={page.related} />
    </main>
  );
}
