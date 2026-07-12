import Image from "next/image";
import Link from "next/link";

import type { PageData } from "@/app/_data/pages";

import styles from "./AboutPages.module.css";

type PageProps = {
  page: PageData;
};

const ownedImages = new Set([
  "/images/juhao-home.webp",
  "/images/juhao-industrial.webp",
  "/images/juhao-commercial.webp",
]);

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
    <main id="main-content" className={`${styles.featurePage} ${styles.historyPage}`} data-page-noindex={page.noindex || undefined}>
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
            待企业档案核验
          </div>
        </div>
      </section>

      <AboutNavigation active="history" />

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <header data-reveal>
          <p className={styles.kicker}>VERIFIED ARCHIVE ONLY</p>
          <h2 id="timeline-title">时间线骨架</h2>
          <p>以下仅展示待核验的信息类别，不代表已发生事件，也不使用未经确认的年份。</p>
        </header>
        <ol className={styles.timeline}>
          {page.highlights.map((item, index) => (
            <li key={item.title} data-reveal data-reveal-delay={String(index * 0.08)}>
              <div className={styles.timelineRail} aria-hidden="true"><span /></div>
              <div className={styles.timelineWhen}>年份待核验</div>
              <article>
                <small>ARCHIVE {String(index + 1).padStart(2, "0")}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className={styles.itemStatus}>未发布</span>
              </article>
            </li>
          ))}
        </ol>
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
          <p className={styles.noIndexNote}>本页在档案完成核验前保持 noindex，避免未完成信息进入搜索结果。</p>
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
