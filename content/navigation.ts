export type NavigationItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export const navigation: NavigationItem[] = [
  { label: "关于钜豪", href: "/about", children: [
    { label: "品牌介绍", href: "/about" },
    { label: "发展历程", href: "/about/history" },
    { label: "加入钜豪", href: "/about/join" },
  ] },
  { label: "照明方案", href: "/solutions", children: [
    { label: "方案总览", href: "/solutions" },
    { label: "全屋照明", href: "/solutions/residential" },
    { label: "酒店照明", href: "/solutions/hospitality" },
    { label: "商业照明", href: "/solutions/commercial" },
    { label: "公共照明", href: "/solutions/public" },
    { label: "工业照明", href: "/solutions/industrial" },
  ] },
  { label: "健康光", href: "/healthy-light" },
  { label: "服务支持", href: "/service", children: [
    { label: "服务与网点", href: "/service" },
    { label: "资料下载", href: "/downloads" },
  ] },
  { label: "合作共创", href: "/partners" },
  { label: "新闻资讯", href: "/news" },
];
