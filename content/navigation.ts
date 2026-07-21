export type NavigationItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
  panelDescription?: string;
  panelImage?: string;
  panelCta?: string;
};

export const navigation: NavigationItem[] = [
  { label: "品牌", href: "/about", panelDescription: "从人的活动、空间功能与长期使用出发，理解钜豪如何把健康光带进真实生活。", panelImage: "/images/jh-brand.webp", panelCta: "进入品牌中心", children: [
    { label: "品牌介绍", href: "/about" },
    { label: "发展历程", href: "/about/history" },
    { label: "加入钜豪", href: "/about/join" },
  ] },
  { label: "产品中心", href: "/products", panelDescription: "从空间任务进入已发布产品、真实型号和可核验参数，不用概念页替代选型资料。", panelImage: "/images/jh-products.webp", panelCta: "浏览全部产品", children: [
    { label: "产品专题", href: "/products" },
    { label: "射灯与轨道照明", href: "/products/spotlights" },
    { label: "灯带与线性照明", href: "/products/linear-lighting" },
    { label: "工程定制", href: "/products/project-custom" },
  ] },
  { label: "照明方案", href: "/solutions", panelDescription: "覆盖住宅、酒店、商业、公共与工业空间，说明为什么这样选光、如何连接产品与项目。", panelImage: "/images/jh-solutions.webp", panelCta: "查看方案总览", children: [
    { label: "方案总览", href: "/solutions" },
    { label: "全屋照明", href: "/solutions/residential" },
    { label: "酒店照明", href: "/solutions/hospitality" },
    { label: "商业照明", href: "/solutions/commercial" },
    { label: "公共照明", href: "/solutions/public" },
    { label: "工业照明", href: "/solutions/industrial" },
  ] },
  { label: "健康与智能", href: "/healthy-light", panelDescription: "把健康照明、场景控制和设备协同拆成可理解、可核对的空间能力。", panelImage: "/images/jh-smart.webp", panelCta: "理解健康与智能", children: [
    { label: "健康光", href: "/healthy-light" },
    { label: "智能家居", href: "/smart-home" },
  ] },
  { label: "工程案例", href: "/cases" },
  { label: "服务支持", href: "/service", panelDescription: "从服务流程、资料下载到网点沟通，为家庭与工程需求找到下一步。", panelImage: "/images/jh-service.webp", panelCta: "进入服务支持", children: [
    { label: "服务与网点", href: "/service" },
    { label: "资料下载", href: "/downloads" },
  ] },
  { label: "钜豪动态", href: "/news", panelDescription: "浏览企业、项目与品牌来源记录，并进入完整企业资料库继续检索。", panelImage: "/images/jh-news.webp", panelCta: "阅读钜豪动态", children: [
    { label: "企业新闻", href: "/news" },
    { label: "企业资料库", href: "/knowledge" },
  ] },
  { label: "合作咨询", href: "/partners" },
];
