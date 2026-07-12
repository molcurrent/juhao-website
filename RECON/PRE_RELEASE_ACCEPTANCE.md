# JUHAO 多页官网预发布验收

- 验收日期：2026-07-12（Asia/Shanghai）
- 工程：Next.js 16 + React 19 + TypeScript + GSAP + CSS Modules + vinext
- 目标域：`https://juhao.com`
- 状态：前端结构、动效、响应式与 SEO 预发布验收通过；企业数据、正式接口、法律文本和域名接入仍未完成。

## 1. 多页与 SEO

- 首页加 29 个独立内页，共 30 个访客 URL，均服务端输出单一 `h1`、可读正文和自指 canonical。
- 当前 sitemap 发布 19 个可索引 URL。另有 11 个待核验或工具页面设置为 `noindex, follow`，且不输出页面级 `WebPage`、`Service`、`FAQPage` 或面包屑结构化数据。
- 页面 title 由各页数据完整提供，根布局不再重复追加品牌名。
- 子页 Open Graph 包含 `site_name`、`locale` 和独立 URL；文章页另含发布时间。文章 JSON-LD 包含图片、语言、稳定的 Organization 发布者引用。
- 首页 canonical 只由首页入口输出；未知路由返回 404、`noindex` 且不再继承首页 canonical。
- 旧 `/brand/**`、`/healthy`、`/esg`、`/investment`、`/download`、`/law` 和数字新闻详情均为 308 迁移；`/news/page/1` 迁移到唯一第一页 `/news`，`/news/page/2` 与 `/3` 保留独立 canonical、title、`CollectionPage` 数据和翻页导航，未知页码返回 404。
- sitemap 的 `lastModified` 只来自真实文章发布日期；没有内容版本证据的页面不再伪造统一更新时间。

暂不收录的页面：`/about/history`、`/about/join`、`/mall`、`/sustainability`、`/service`、`/partners`、`/downloads`、`/search`、`/contact`、`/legal`、`/privacy`。

## 2. 页面、动效与交互

- 首页客户端逻辑已从路由入口拆到 `features/home`，路由入口保持服务端 metadata 能力。
- 首页 WebGL 使用双纹理噪声位移转场，包含 DPR 上限、cover UV、ResizeObserver、失败降级、context lost/restored 与资源释放；静态背景始终作为兜底。
- 首页资讯统一使用可访问 Carousel，支持前后、分页、方向键、Home/End、触摸滑动、自动播放与暂停；隐藏页不进入焦点序列。
- 关于页新增自有素材品牌场景轮播，三层画框、图片缩放与文案同步切换，复用同一套键盘、触摸、自动播放、暂停和 reduced-motion 规则。
- 桌面导航支持 hover/focus 二级菜单和独立搜索入口；移动端抽屉提供搜索入口、子菜单、打开后首焦点、首尾 Tab 循环、Esc、背景 inert、滚动锁与关闭后焦点回送。
- 全站浮动操作层提供方案咨询与返回顶部：返回顶部只在达到滚动阈值后进入可见和键盘序列，联系页不显示自链接。路由变化使用 JUHAO 幕布过场，并以会话中的上一路径兼容客户端导航和整页重载。
- Footer 已从平铺链接重构为品牌、照明方案、服务合作、内容联系和法律信息五组语义导航；桌面四列、手机两列，使用现有路由，不虚构备案、地址、电话或邮箱。
- 五类照明场景均有独立入口；商业场景具备 Mock 产品加载、空态、错误重试、产品原生 dialog、焦点回送和可见 FAQ。
- 服务页具备地区/城市联动、查询、加载/空态/错误/结果和 FAQ；合作页具备区域选择、选中状态、说明面板及错误重试。
- 智能家居具备完整 Tab 键盘模型；搜索、新闻列表和下载均通过 `SiteApi`，覆盖加载、错误重试、空态与成功态。新闻列表按每页 2 篇输出 3 个 SSR 页面，翻页后客户端刷新仍保持当前页请求，不会回退到第一页数据。
- `SiteApi` 已增加可配置的 HTTPS/CMS adapter、10 秒超时、HTTP 错误归一化和响应结构校验。联系页默认只做本地预检；仅在正式 API 与独立开关同时启用时，才显示联系人、隐私确认、提交中、失败和受理编号状态。
- `prefers-reduced-motion` 下停止自动播放和 GSAP/WebGL/路由幕布动效，返回顶部改为即时滚动；正文、静态图片与全部核心操作仍可用。

## 3. 自动化与浏览器证据

| 检查 | 结果 |
|---|---|
| TypeScript | 通过 |
| ESLint | 通过 |
| production build | 通过 |
| Node SSR/SEO 测试 | 11/11 通过 |
| HTTP/CMS adapter 契约检查 | 通过（分页、咨询提交、HTTPS 限制、异常结构拒绝） |
| 三档浏览器交互 | 1440×900、768×1024、390×844 通过 |
| 30 路由 DOM/SEO/基础无障碍巡检 | 1440×900 与 390×844 共 60 次页面检查通过 |
| 控制台错误 / page error / HTTP ≥400 | 0 / 0 / 0（已测正常流程） |
| reduced-motion | WebGL 隐藏、静态背景可见、自动播放控制移除 |

三档浏览器实际覆盖：首页首屏切换、资讯轮播、桌面/移动导航及搜索、移动抽屉焦点闭环、分组 Footer、产品 dialog、服务地区查询与 FAQ、智能场景、合作区域选择、联系预检、关键词搜索、资讯第 1→2→3 页的客户端导航，以及浮动咨询、返回顶部、路由幕布和 reduced-motion 降级。

本地 production server 的代表性页面资源传输约为 0.55–0.89 MB，记录到的 CLS 为 0，且没有第三方网络 origin。该结果只用于本机构建回归，不等同于公网 Lighthouse 或真实用户 Core Web Vitals。

## 4. 品牌、版权与依赖审计

- `app/`、`components/`、`content/`、`features/`、`lib/`、`public/`、`styles/` 与 production `dist/` 中，原站域名、雷士、CNZZ、`upfiles`、`templates/dist` 和 `eval(` 命中数均为 0。
- 五张公开场景图为本轮生成并人工筛查的 JUHAO WebP；与本地 NVC 镜像文件 SHA-256 重合数为 0。
- `public/images` 五张主视觉合计约 0.78 MB；当前整个 `public` 约 2.4 MB。
- `npm audit --omit=dev` 当前为 0 high、0 critical、2 moderate。两项来自 Next 16 内嵌 PostCSS 链；npm 给出的自动修复会降级到不兼容的 Next 9，因此未执行破坏性降级。

## 5. 尚未满足的正式上线条件

1. 已定义并实现目标 CMS/API 字段契约，但尚未提供钜豪真实 API 地址、鉴权/跨域配置与可核验数据；产品、门店、合作区域、搜索、新闻与下载因此仍使用 `SiteApi` Mock adapter。
2. 历史、招聘、商城能力、服务网点、合作政策、ESG 数据、下载文件、联系方式、法律与隐私文本仍需企业一手资料审核。
3. 联系页已预留正式提交能力，但真实接口、隐私流程和受理责任尚未确认，提交开关保持关闭；下载页也没有已核验文件。因此相关页面继续 `noindex`。
4. `juhao.com` 尚未附加到 Sites 项目，DNS、SSL、apex/`www` 301 策略和公网回归未完成。
5. Sites 项目当前仅允许项目所有者访问；在企业内容和域名准备完成前，不应改为公开访问。

## 6. 结论

当前版本已经是可运行、可测试、可替换数据源的多页 SEO 工程，不再是单页原型。它适合部署为所有者可见的预发布版本，但不能把 Mock 数据或待审核页面作为正式企业信息公开收录。
