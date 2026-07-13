import type { PageData } from "@/app/_data/pages";

export const productTopics = [
  { slug: "spotlights", title: "射灯与轨道照明", count: 10, scene: "重点照明", description: "面向住宅、酒店与商业空间的重点照明，以光束角、配光、防眩和安装条件为选型起点。", image: "/images/juhao-commercial.webp" },
  { slug: "ceiling-lights", title: "家居顶灯", count: 10, scene: "家庭基础照明", description: "覆盖客餐厅、卧室与辅助空间的基础照明，关注空间尺度、显色、清洁维护与控制方式。", image: "/images/juhao-home.webp" },
  { slug: "new-chinese", title: "新中式", count: 10, scene: "风格照明", description: "将东方尺度、材质与空间秩序融入灯饰表达，适用于住宅、会所与酒店空间。", image: "/images/juhao-hero.webp" },
  { slug: "art-lights", title: "艺术灯", count: 10, scene: "装饰照明", description: "以造型、材质与光影关系参与空间表达，产品资料将按型号和项目适配性逐步开放。", image: "/images/juhao-hero.webp" },
  { slug: "crystal-chandeliers", title: "水晶吊灯", count: 10, scene: "酒店与宴会", description: "面向挑高大堂、宴会厅与高端住宅，重点核对尺寸、承重、安装与维护条件。", image: "/images/juhao-commercial.webp" },
  { slug: "linear-lighting", title: "灯带与线性照明", count: 10, scene: "轮廓与氛围", description: "用于空间轮廓、间接照明与连续引导，选型同时考虑光效、色温、驱动与安装节点。", image: "/images/juhao-public.webp" },
  { slug: "switches", title: "开关电工", count: 10, scene: "空间控制", description: "连接照明回路与日常使用，关注负载、接线、面板组合及与智能场景的协同。", image: "/images/juhao-industrial.webp" },
  { slug: "outdoor-lighting", title: "户外照明", count: 10, scene: "建筑与景观", description: "服务建筑立面、道路与景观空间，需结合防护等级、配光、环境条件与维护方式选型。", image: "/images/juhao-public.webp" },
  { slug: "project-custom", title: "工程定制", count: 10, scene: "非标与项目", description: "围绕项目空间、造型、结构、安装和交付条件开展定制沟通，不以标准商品页替代工程确认。", image: "/images/juhao-commercial.webp" },
  { slug: "smart-home-devices", title: "家居智能设备", count: 10, scene: "场景联动", description: "覆盖照明控制与空间联动设备，正式选型需核对协议、兼容范围、部署与售后条件。", image: "/images/juhao-home.webp" },
] as const;

export type ProductTopic = (typeof productTopics)[number];

export const caseStudies = [
  {
    slug: "jw-marriott-shenzhen-huafa-snow-world", sourceId: "226", title: "深圳华发冰雪世界 JW 万豪酒店", type: "酒店照明", stage: "签约 / 中标项目", image: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c7439f6e3e8.png",
    summary: "围绕高端酒店的公共区域、宴会会议、餐饮休闲与客房场景，规划连续而有层次的光环境。",
    background: "项目位于深圳华发冰雪世界综合体，酒店空间涵盖抵达、社交、会议、餐饮、休闲与住宿等多种使用场景。",
    strategy: ["以公共区域的空间层次建立抵达体验", "为宴会与会议空间预留多场景照明", "兼顾餐饮氛围、客房休憩与阅读需求"],
    solutionScope: ["大堂与大堂吧", "宴会与会议空间", "餐饮与休闲区域", "客房照明"],
    productList: ["定制装饰灯具", "重点照明灯具", "线性与间接照明", "客房壁灯及阅读灯"],
    completionEvidence: ["完工实景图：待项目组补充", "最终产品型号清单：待项目组确认", "调试与验收记录：待补充"],
    evidenceLabel: "中标新闻与空间方案图，不作为完工证明",
    evidenceImages: [
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c743ad43839.png", alt: "深圳华发冰雪世界 JW 万豪酒店项目资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c743db9106a.jpg", alt: "酒店公共区域方案资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c7444d27e39.jpg", alt: "酒店客房区域方案资料图" },
    ],
  },
  {
    slug: "pullman-shangrao-guangfeng", sourceId: "231", title: "上饶广丰铂尔曼酒店", type: "酒店照明", stage: "签约 / 中标项目", image: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-05/6a15460fa0817.jpg",
    summary: "以东方空间语汇组织大堂、餐厅、宴会与客房的照明层次，服务不同功能与停留节奏。",
    background: "项目为上饶广丰的五星级酒店项目，资料显示照明范围涉及大堂、餐饮、宴会与客房等核心区域。",
    strategy: ["用线性与重点照明梳理大堂结构", "兼顾餐饮空间的社交属性与桌面体验", "以分层布光支持宴会与客房的不同状态"],
    solutionScope: ["酒店大堂", "全日餐厅", "宴会厅", "客房区域"],
    productList: ["线性格栅灯", "嵌入式重点照明", "壁灯与装饰灯具", "水晶吊灯及间接照明"],
    completionEvidence: ["现有图片为项目方案资料", "完工实景图：待项目组补充", "最终型号与数量清单：待确认"],
    evidenceLabel: "中标新闻与设计方案图，不作为完工证明",
    evidenceImages: [
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-05/6a15461de56c3.jpg", alt: "上饶广丰铂尔曼酒店项目资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-05/6a15464ab6b2c.jpg", alt: "酒店大堂照明方案资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-05/6a1546c0e62ee.jpg", alt: "酒店宴会厅照明方案资料图" },
    ],
  },
  {
    slug: "grand-hyatt-suzhou-financial-street", sourceId: "228", title: "苏州金融街君悦酒店", type: "酒店照明", stage: "签约 / 中标项目", image: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d5b8c623027.jpg",
    summary: "结合苏州地域文化与酒店空间功能，围绕大堂、大堂吧、餐厅和宴会空间规划光影表达。",
    background: "项目位于苏州太湖新城，资料以君悦酒店的公共空间、餐饮和宴会功能为重点展开照明策略。",
    strategy: ["以定制灯饰回应江南文化语汇", "通过间接光与重点光控制公共区域眩光", "用可切换的层次满足宴会空间多功能需求"],
    solutionScope: ["大堂与大堂吧", "全日餐厅", "大小宴会厅", "公共空间照明"],
    productList: ["非标定制灯饰", "嵌入式射灯", "线性灯带", "壁灯、台灯与落地灯"],
    completionEvidence: ["现有图片为设计与项目资料", "完工实景与交付日期：待补充", "控制场景与产品型号清单：待确认"],
    evidenceLabel: "中标新闻与设计方案图，不作为完工证明",
    evidenceImages: [
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d5b8e1e5c72.jpg", alt: "苏州金融街君悦酒店项目资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d5b8ffc883d.jpg", alt: "酒店大堂灯饰方案资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d5ba31b70dc.jpg", alt: "酒店客房照明方案资料图" },
    ],
  },
  {
    slug: "doubletree-nantong-haimen", sourceId: "229", title: "南通海门希尔顿逸林酒店", type: "酒店照明", stage: "签约 / 中标项目", image: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d89ab58183c.jpg",
    summary: "以现代轻奢、东方意境与场景适配为方向，建立酒店不同功能空间的照明框架。",
    background: "项目定位为南通海门的高端酒店与城市会客空间，现有企业资料确认钜豪照明中标该项目。",
    strategy: ["按酒店功能区拆分照明任务", "平衡品牌氛围与商旅使用需求", "从方案、产品到调试形成项目协同"],
    solutionScope: ["酒店公共区域", "餐饮与会议空间", "客房及配套空间", "项目调试服务"],
    productList: ["定制灯饰（资料已提及）", "基础照明产品清单待项目组补充", "控制系统清单待项目组补充"],
    completionEvidence: ["当前仅确认中标与方案方向", "完工实景图：待补充", "产品与调试验收资料：待补充"],
    evidenceLabel: "中标新闻与项目概念图，不作为完工证明",
    evidenceImages: [
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d89ad000e0b.jpg", alt: "南通海门希尔顿逸林酒店项目资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d89b1e098b9.jpg", alt: "酒店照明项目方案资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-04/69d89b42e2509.jpg", alt: "酒店空间方案资料图" },
    ],
  },
  {
    slug: "yangzhou-riverfront-lighting", sourceId: "220", title: "扬州经开区“一河两岸”户外亮化工程", type: "户外亮化", stage: "签约 / 中标项目", image: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2025-12/69392e5990867.png",
    summary: "围绕滨水城市界面，以科技、人文、生态与活力为线索组织多层次夜间光环境。",
    background: "项目面向扬州经开区滨水空间与城市夜间界面，现有资料确认钜豪照明中标，尚不表述为完工案例。",
    strategy: ["强化滨水动线与建筑界面的夜间识别", "控制亮度层级，避免把亮化等同于高亮", "结合节能控制、维护条件与环境影响评估"],
    solutionScope: ["滨水夜景界面", "建筑与街区亮化", "动线识别", "智能控制与节能管理"],
    productList: ["户外建筑照明产品", "景观与线性照明", "智能控制系统", "具体型号与数量待深化确认"],
    completionEvidence: ["当前为中标项目资料", "夜景完工实拍：待补充", "控制系统验收与能耗资料：待补充"],
    evidenceLabel: "中标新闻与项目概念图，不作为夜景完工证明",
    evidenceImages: [
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2025-12/69392e6d12085.png", alt: "扬州经开区一河两岸项目概念资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2025-12/69392e9e84b11.jpg", alt: "户外亮化项目企业资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2025-12/69392e93b7d52.jpg", alt: "户外照明企业资料图" },
    ],
  },
  {
    slug: "china-smart-road-lighting-conference-2026", sourceId: "225", title: "2026 中国智慧道路照明大会", type: "智慧道路", stage: "行业活动 / 荣誉", image: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c741c8e3bc7.jpg",
    summary: "钜豪照明参与智慧道路照明行业交流，并获大会优秀合作伙伴称号。",
    background: "大会围绕智慧城市、技术标准、产学研用与绿色发展展开，资料记录了钜豪照明的参会和获奖信息。",
    strategy: ["关注道路照明数字化升级", "把节能控制与长期运维纳入系统方案", "持续核验具体项目参数与产品检测资料"],
    solutionScope: ["智慧道路照明交流", "城市照明数字化", "节能控制", "行业合作"],
    productList: ["大会展示设备清单：待活动团队补充", "智慧道路系统资料：待整理", "不作为完工工程产品清单"],
    completionEvidence: ["活动现场与获奖图片已记录", "该条为行业活动，不适用完工验收", "后续可补充展示产品和演讲资料"],
    evidenceLabel: "大会现场与荣誉记录，不属于工程完工案例",
    evidenceImages: [
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c741d538798.jpg", alt: "中国智慧道路照明大会现场资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c741e49dc91.jpg", alt: "大会交流现场资料图" },
      { src: "https://bocang.oss-cn-shenzhen.aliyuncs.com/upload/image/2026-03/69c741eeba42f.jpg", alt: "大会荣誉资料图" },
    ],
  },
] as const;

export type CaseStudy = (typeof caseStudies)[number];

export function catalogPageData(routeKey: string): PageData | null {
  const topic = routeKey.startsWith("products/") ? productTopics.find((item) => `products/${item.slug}` === routeKey) : undefined;
  if (topic) return {
    path: `/${routeKey}`, label: topic.title, eyebrow: "PRODUCT TOPIC", title: topic.title,
    seoTitle: `${topic.title}｜产品专题｜钜豪照明`, description: `${topic.description} 浏览钜豪照明${topic.title}专题与相关方案入口。`, image: topic.image,
    intro: topic.description, type: "page",
    highlights: [{ title: "按场景理解", text: topic.scene }, { title: "按参数核对", text: "型号、功率、尺寸、配光与安装条件需以正式资料为准。" }],
    sections: [{ title: "专题说明", text: topic.description }, { title: "发布规则", text: "产品详情按销售状态、图片、参数、事业部和资料完整性完成审核后逐步开放。" }],
    related: [{ label: "返回产品中心", href: "/products", text: "查看全部产品专题。" }, { label: "查看照明方案", href: "/solutions", text: "按空间场景理解选型方法。" }, { label: "咨询产品与方案", href: "/contact?source=product-topic&scene=project&intent=project-brief", text: "提交空间、阶段和需求。" }],
  };
  const study = routeKey.startsWith("cases/") ? caseStudies.find((item) => `cases/${item.slug}` === routeKey) : undefined;
  if (study) return {
    path: `/${routeKey}`, label: study.title, eyebrow: "PROJECT UPDATE", title: study.title,
    seoTitle: `${study.title}｜${study.stage}｜钜豪照明`, description: `${study.summary} 当前阶段：${study.stage}。`, image: study.image,
    intro: study.summary, type: "page",
    highlights: [{ title: "项目类型", text: study.type }, { title: "当前阶段", text: study.stage }, { title: "资料编号", text: `企业知识库文章 ${study.sourceId}` }],
    sections: [{ title: "项目背景", text: study.background }, { title: "照明策略", text: "现有项目资料形成以下方向；具体型号、参数与实施结果以项目最终资料为准。", points: [...study.strategy] }],
    related: [{ label: "返回工程案例", href: "/cases", text: "浏览酒店、户外与智慧道路项目动态。" }, { label: "酒店照明方案", href: "/solutions/hospitality", text: "了解酒店空间的照明方法。" }, { label: "提交工程需求", href: "/contact?source=case-detail&scene=project&intent=project-brief", text: "从项目类型与阶段开始沟通。" }],
  };
  return null;
}
