import Image from "next/image";
import Link from "next/link";
import { SemanticPicture } from "@/components/media/SemanticPicture";
import { AccessibleCarousel } from "@/components/ui/AccessibleCarousel";

const newsItems = [
  {
    category: "企业动态",
    date: "2026.06.11",
    dateTime: "2026-06-11",
    source: "企业资料 #232",
    title: "2026 广州光亚展参展来源记录",
    summary: "来源记录提及 8.1-D18 展位；客流、洽谈量与渠道成效未作独立核验。",
    status: "参展报道 · 成效待核验",
    href: "/news/guangzhou-international-lighting-exhibition-2026",
    media: {
      src: "/images/jh48-news-light-fair.webp",
      alt: "原创展陈光环境场景示意，不作为光亚展现场、展位或参展成效证据",
      note: "原创栏目场景 · 非活动现场证据",
    },
  },
  {
    category: "项目动态",
    date: "2026.05.26",
    dateTime: "2026-05-26",
    source: "企业资料 #231",
    title: "上饶广丰铂尔曼酒店：按空间拆解方案证据",
    summary: "资料记录项目签约 / 中标阶段，并按大堂、餐饮、宴会与客房拆解方案方向。",
    status: "签约 / 中标 · 后续实施待证",
    href: "/cases/pullman-shangrao-guangfeng",
    media: {
      mediaId: "media-61499a8e2f892e2b4efe",
      alt: "上饶广丰铂尔曼酒店项目资料主图，不作为交付或完工证明",
      note: "企业资料图 · 非交付或完工证明",
    },
  },
  {
    category: "项目动态",
    date: "2026.03.28",
    dateTime: "2026-03-28",
    source: "企业资料 #226",
    title: "深圳华发冰雪世界 JW 万豪酒店：签约项目方案档案",
    summary: "资料覆盖公共区域、宴会会议、餐饮休闲与客房；最终产品及交付状态待补充。",
    status: "签约 / 中标 · 后续实施待证",
    href: "/cases/jw-marriott-shenzhen-huafa-snow-world",
    media: {
      mediaId: "media-d613f98d1383b9f3c425",
      alt: "深圳华发冰雪世界 JW 万豪酒店项目资料主图，不作为交付或完工证明",
      note: "企业资料图 · 非交付或完工证明",
    },
  },
  {
    category: "企业动态",
    date: "2026.03.17",
    dateTime: "2026-03-17",
    source: "企业资料 #224",
    title: "2026 春季经销商会议来源记录",
    summary: "来源记录显示活动于 3 月 12 日至 13 日召开；参会规模与合作成果未独立核验。",
    status: "活动召开 · 规模与成果待核验",
    href: "/news/dealer-conference-spring-2026",
    media: {
      src: "/images/jh48-news-dealer.webp",
      alt: "原创展厅交流空间场景示意，不作为经销商活动现场、参会规模或活动成效证据",
      note: "原创栏目场景 · 非活动现场证据",
    },
  },
  {
    category: "品牌动态",
    date: "2026.01.20",
    dateTime: "2026-01-20",
    source: "企业资料 #223",
    title: "两项 TOP10 品牌荣誉来源记录",
    summary: "来源记录提及工程照明与设计师推荐品牌两项荣誉；证书及主办方公告仍待审核。",
    status: "荣誉来源 · 原始材料待审",
    href: "/news/lighting-industry-top10-source-record-2026",
    media: {
      src: "/images/jh48-news-brand-award.webp",
      alt: "原创照明档案展陈场景示意，不作为奖项证书、主办方公告或获奖事实证据",
      note: "原创栏目场景 · 非获奖事实证据",
    },
  },
  {
    category: "品牌动态",
    date: "2026.01.20",
    dateTime: "2026-01-20",
    source: "企业资料 #222",
    title: "2025 年度家居照明品牌荣誉来源记录",
    summary: "来源记录提及年度家居照明品牌荣誉；证书、授予主体与主办方公告仍待审核。",
    status: "荣誉来源 · 原始材料待审",
    href: "/news/home-lighting-brand-source-record-2025",
    media: {
      src: "/images/jh48-news-home-brand.webp",
      alt: "原创家居光环境场景示意，不作为奖项证书、主办方公告或获奖事实证据",
      note: "原创栏目场景 · 非获奖事实证据",
    },
  },
  {
    category: "项目动态",
    date: "2025.12.11",
    dateTime: "2025-12-11",
    source: "企业资料 #221",
    title: "宜昌首航国际大酒店：中标来源记录",
    summary: "当前仅保留来源能够支持的中标阶段；施工、供货、交付与完工状态待证。",
    status: "中标报道 · 后续实施待证",
    href: "/news/yichang-shouhang-hotel-bid",
    media: {
      src: "/images/jh48-news-yichang-hotel.webp",
      alt: "原创滨水酒店场景示意，不作为宜昌首航国际大酒店中标、交付或完工证据",
      note: "原创栏目场景 · 非项目实施证据",
    },
  },
  {
    category: "项目动态",
    date: "2025.11.21",
    dateTime: "2025-11-21",
    source: "企业资料 #219",
    title: "昆明官渡温德姆酒店：中标来源记录",
    summary: "当前仅保留来源能够支持的中标阶段；施工、供货、交付与完工状态待证。",
    status: "中标报道 · 后续实施待证",
    href: "/news/kunming-guandu-wyndham-hotel-bid",
    media: {
      src: "/images/jh48-news-kunming-hotel.webp",
      alt: "原创亚热带酒店场景示意，不作为昆明官渡温德姆酒店中标、交付或完工证据",
      note: "原创栏目场景 · 非项目实施证据",
    },
  },
] as const;

export default function HomeNews() {
  return <AccessibleCarousel ariaLabel="钜豪照明资讯与项目动态">
    {newsItems.map((item, index) => <Link
      aria-label={`${item.title}，${item.status}`}
      className="homeNewsSlide"
      href={item.href}
      key={item.href}
    >
      <article className="homeNewsCard">
        <figure className="homeNewsMedia">
          {"mediaId" in item.media
            ? <SemanticPicture
                alt={item.media.alt}
                imageClassName="homeNewsImage"
                mediaId={item.media.mediaId}
                sizes="(max-width: 760px) 100vw, 42vw"
              />
            : <Image
                alt={item.media.alt}
                className="homeNewsImage"
                height={941}
                sizes="(max-width: 760px) 100vw, 42vw"
                src={item.media.src}
                width={1672}
              />}
          <figcaption>{item.media.note}</figcaption>
        </figure>

        <div className="homeNewsContent">
          <header className="homeNewsMeta">
            <span className="homeNewsIndex">{String(index + 1).padStart(2, "0")}</span>
            <span className="homeNewsCategory">{item.category}</span>
            <time className="homeNewsDate" dateTime={item.dateTime}>{item.date}</time>
          </header>

          <div className="homeNewsBody">
            <p className="homeNewsSource">{item.source}</p>
            <h3>{item.title}</h3>
            <p className="homeNewsSummary">{item.summary}</p>
          </div>

          <footer className="homeNewsFooter">
            <span className="homeNewsStatus"><i aria-hidden="true" />{item.status}</span>
            <span className="homeNewsCta">查看资料边界 <b aria-hidden="true">↗</b></span>
          </footer>
        </div>
      </article>
    </Link>)}
  </AccessibleCarousel>;
}
