export type NavigationItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export const navigation: NavigationItem[] = [
  { label: "品牌", href: "/about", children: [
    { label: "品牌介绍", href: "/about" },
    { label: "发展历程", href: "/about/history" },
    { label: "加入钜豪", href: "/about/join" },
  ] },
  { label: "产品中心", href: "/products", children: [
    { label: "产品专题", href: "/products" },
    { label: "射灯与轨道照明", href: "/products/spotlights" },
    { label: "灯带与线性照明", href: "/products/linear-lighting" },
    { label: "工程定制", href: "/products/project-custom" },
  ] },
  { label: "照明方案", href: "/solutions", children: [
    { label: "方案总览", href: "/solutions" },
    { label: "全屋照明", href: "/solutions/residential" },
    { label: "酒店照明", href: "/solutions/hospitality" },
    { label: "商业照明", href: "/solutions/commercial" },
    { label: "公共照明", href: "/solutions/public" },
    { label: "工业照明", href: "/solutions/industrial" },
  ] },
  { label: "健康与智能", href: "/healthy-light", children: [
    { label: "健康光", href: "/healthy-light" },
    { label: "智能家居", href: "/smart-home" },
  ] },
  { label: "工程案例", href: "/cases" },
  { label: "服务支持", href: "/service", children: [
    { label: "服务与网点", href: "/service" },
    { label: "资料下载", href: "/downloads" },
  ] },
  { label: "钜豪动态", href: "/news" },
  { label: "合作咨询", href: "/partners" },
];
