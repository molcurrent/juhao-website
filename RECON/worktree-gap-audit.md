# 当前工作树与 NVC 旧镜像差距审计

> 本文保留为实现前的差距快照，表格中的“当前状态”不随工程迭代回写；最新完成度以 [PRE_RELEASE_ACCEPTANCE.md](PRE_RELEASE_ACCEPTANCE.md) 为准。

审计日期：2026-07-12
审计性质：只读代码与静态证据对照，不等同于当前原站运行时复测
目标：识别当前 JUHAO 工程相对 NVC 访客侧页面、模块和交互基线的缺口；公开版本仍须使用钜豪自有品牌、文案和素材。

## 1. 结论先行

当前工作树已经具备 Next.js/TypeScript 多页 SEO 的基础，但仍是一个 **13 个可索引 URL 的内容原型**，不是“全量页面与交互复刻”工程：

- 旧路由证据包含 23 个 HTML 页面和 1 个被爬到的 PDF 资源；当前包含首页和 `pages` 注册表中的 12 个内页，共 13 个页面 URL。
- 旧 23 个 HTML 路径中，当前仅 `/`、`/about`、`/news` 三个路径同名存在，精确路径覆盖为 **3/23（13.0%）**。这只表示路径存在，不表示模块、视觉或交互等价。
- 当前 12 个内页全部由 `app/[...slug]/page.tsx` 的同一套“Hero → 核心要点 → 正文 → 可选 FAQ → 相关推荐 → CTA”模板渲染；没有 About、Business、Service、Investment、ESG、Download、Search 等独立页面模块。
- 当前已有的主要交互只有首页场景 hover/focus/tap 切换、首页导航滚动变色、移动端平面抽屉、原生 `<details>` FAQ 和 CSS hover/过渡。旧证据中的加载器、二级导航、Canvas/WebGL、视频、Swiper、产品热点与弹窗、服务网点查询、招商区域查询、新闻搜索/分页、下载展开等均未实现。
- 当前依赖中没有 GSAP、Swiper 或其他动效运行时，也没有统一 Motion 层、Mock/API 适配层和按业务域拆分的 feature 模块。
- 当前 SEO 测试只抽查 5 个页面 URL；它不能证明 13 个当前页面全覆盖，更不能证明旧页面族、响应式视觉和交互覆盖。

**最优先工程缺口**：不是再补通用文案，而是先完成“旧页面族 → JUHAO 目标路由”的显式映射，并把通用 catch-all 内页拆成可独立实现和验收的业务页面骨架。第一条高复杂度纵切应选择“业务/产品场景页”：场景切换、分类 Tab、产品卡片、热点、产品弹窗和 Mock 数据层一起落地。它能最早验证路由、组件、数据、动效和响应式架构是否真的支撑全量复刻。

## 2. 证据口径

### 2.1 证据等级

- **SOURCE**：当前工作树源文件、旧镜像 HTML、旧路由 JSON 或旧前端 bundle 中可直接读取的事实。
- **PARTIAL**：当前存在语义相近的页面或文案，但路径、结构或交互不等价。
- **NOT PROVEN**：旧静态证据或本次只读审计不能证明，必须靠当前原站抓取、浏览器操作、网络捕获或业务方资料确认。

### 2.2 旧基线

- 路由文件：`/Users/mac/projects/website-clones/nvc-lighting-clone/RECON/routes/original-route-map.json`
- 抓取时间：`2026-07-06T07:37:51.646Z`
- 抓取参数：最大 30 页、深度 2。
- 路由数组：24 条，其中 23 条 HTML 页面、1 条 PDF 资源。
- 页面证据：`/Users/mac/projects/website-clones/nvc-lighting-clone/site/**/index.html`
- 行为证据：`/Users/mac/projects/website-clones/nvc-lighting-clone/site/templates/dist/js/app.min.js`

这份旧快照可用于发现工作树缺口，但不能替代对 **当前线上 NVC** 的重新抓取。任何与当前线上状态有关的结论均应在阶段 0 复测后更新。

### 2.3 当前工作树

- 首页专用页面：`app/page.tsx`
- 内页通用渲染器：`app/[...slug]/page.tsx`
- 内页注册表：`app/_data/pages.ts`
- 全站壳层：`app/_components/SiteHeader.tsx`、`app/_components/SiteFooter.tsx`
- 样式：`app/globals.css`
- SEO：`app/layout.tsx`、`app/sitemap.ts`、`app/robots.ts`
- 当前测试：`tests/rendered-html.test.mjs`

## 3. 当前页面与工程形态

### 3.1 当前 13 个页面 URL

| 页面类型 | 当前 URL | 实现方式 |
|---|---|---|
| 首页 | `/` | 独立 React 客户端页面 |
| 品牌简介 | `/about` | 通用内页模板 |
| 方案总览 | `/solutions` | 通用内页模板 |
| 全屋方案 | `/solutions/residential` | 通用内页模板 |
| 商业方案 | `/solutions/commercial` | 通用内页模板 |
| 公共方案 | `/solutions/public` | 通用内页模板 |
| 工业方案 | `/solutions/industrial` | 通用内页模板 |
| 智能家居 | `/smart-home` | 通用内页模板 |
| 商城平台 | `/mall` | 通用内页模板 |
| 新闻资讯 | `/news` | 通用内页模板 |
| 文章详情 | `/news/healthy-home-lighting` | 通用内页模板 |
| 文章详情 | `/news/smart-lighting-planning` | 通用内页模板 |
| 联系合作 | `/contact` | 通用内页模板 |

SOURCE：`app/_data/pages.ts:20-117` 注册 12 个内页；`app/page.tsx` 提供首页；`app/[...slug]/page.tsx:11-13` 将注册表生成静态参数。

### 3.2 已完成但不应被误判为“全量复刻”的能力

- 每个注册页有独立 title、description、canonical、Open Graph 和结构化数据。
- `sitemap.xml` 会输出首页与全部注册页。
- 有品牌 404、skip link、focus-visible 和 `prefers-reduced-motion` 降级。
- 首页已有 4 类场景的 hover/focus/tap 切换。
- 移动端已有一级菜单开关。

这些能力是可靠的工程起点，但不覆盖旧站页面族和功能状态。

## 4. 路由差距矩阵

“路径结论”只对当前代码注册情况负责；语义映射不等于页面还原。

| 旧 HTML 路径 | 旧页面角色（SOURCE） | 当前对应 | 判定 | 需要补齐 |
|---|---|---|---|---|
| `/` | 首页：多帧 Hero、品牌/使命、五类业务、产品、资讯 | `/` | 路径存在，模块与动效不等价 | 保留当前品牌内容，重建原节奏、状态和动效 |
| `/about` | 企业简介、价值、荣誉轮播、渠道网络 | `/about` | 路径存在，当前仅通用内容页 | 独立 About 模板及各内容段 |
| `/about/history` | 单页纵向大事记/时间线 | 无 | 缺失 | 建立品牌历史页面与时间线交互 |
| `/about/join` | 校招/社招入口、团队与办公环境轮播 | 无 | 缺失 | 建立加入钜豪页面；招聘链接和内容需企业确认 |
| `/news` | 新闻列表、搜索框、卡片列表、分页 | `/news` | 路径存在，但当前不是新闻列表模块 | 分类/搜索/列表/分页/空状态 |
| `/news/page/2` | 新闻第二页 | 无 | 缺失 | 分页 URL 或等价 query/cursor 方案，并定义 canonical |
| `/news/123` | 新闻/PDF 型详情 | `/news/healthy-home-lighting` 语义近似 | PARTIAL，旧路径不存在 | 保留自有文章内容；补详情模板、附件/相关内容状态 |
| `/news/124` | 社会责任报告详情 | 无自有同类内容 | 缺失 | 仅在钜豪有已核实报告时建立报告详情 |
| `/news/125` | 排放报告详情 | 无自有同类内容 | 缺失 | 仅在钜豪有已核实报告时建立报告详情 |
| `/brand` | 业务品牌入口；旧快照内容等同全屋页 | `/solutions` | PARTIAL，路径和模板不同 | 明确目标 IA；建立 `/solutions` 总览并决定是否需要 alias |
| `/brand/whole_house` | 全屋场景、品类 Tab、热点、产品弹窗、优势段 | `/solutions/residential` | PARTIAL，仅有通用方案文案 | 独立全屋场景与产品模块 |
| `/brand/hotel` | 酒店场景、品类 Tab、产品弹窗、案例/优势 | 商业页中仅一个“酒店空间”要点 | 无独立页面 | 建立酒店方案页；不能用一张要点卡替代 |
| `/brand/business` | 商业场景、产品分类、热点与弹窗 | `/solutions/commercial` | PARTIAL，仅有通用方案文案 | 独立商业场景与产品模块 |
| `/brand/public` | 公共场景、产品分类、热点与弹窗 | `/solutions/public` | PARTIAL，仅有通用方案文案 | 独立公共场景与产品模块 |
| `/brand/special` | 特种/工业产品分类、热点与弹窗 | `/solutions/industrial` | PARTIAL，概念被扩大 | 定义“工业”和“特种”边界；按目标业务决定独立或合并 |
| `/healthy` | 健康照明技术的 7 段滚动叙事与多组轮播 | 内容散落在 `/about`、全屋页和文章 | 无独立页面 | 建立健康光技术/理念专题页 |
| `/esg` | 11 段 ESG 叙事、多组轮播、图片放大层 | 无 | 缺失 | 建立可持续发展/ESG 页面；数据必须用自有资料 |
| `/service` | 售后政策、质保 Tab、FAQ、门店查询、防伪/售后 | `/contact` 仅有咨询准备说明 | 缺失，不应视为 PARTIAL | 建立服务支持域和 Mock/API 适配层 |
| `/investment` | 招商类型、运营体系、区域联系人、保障/支持 Tab | `/mall`、`/contact` 有渠道文案 | PARTIAL，但核心流程缺失 | 建立招商合作页与区域数据交互 |
| `/download` | 软件卡片、详情展开、文件下载反馈 | 无 | 缺失 | 下载列表、元数据、展开态、文件状态 |
| `/search` | GET `keywords` 搜索、推荐词、结果区 | 无 | 缺失 | 搜索表单、结果、无结果、错误/加载状态 |
| `/law` | 法律声明 | 无 | 缺失 | 使用钜豪经审核的法律文本 |
| `/privacy` | 隐私条款 | 无 | 缺失 | 使用钜豪经审核的隐私文本 |

补充：旧路由抓取还发现 `/upfiles/files/20250508109314.pdf`。它是静态资源，不应计作 HTML 页面，但说明新闻/ESG/下载体系需要支持附件元数据与可用性反馈。

## 5. 页面模块差距

### 5.1 全站壳层

| 能力 | 旧证据 | 当前状态 | 缺口 |
|---|---|---|---|
| PC 一级/二级导航 | 首页 HTML `28-77` 包含 About 与 Brand 二级菜单 | 当前 `SiteHeader` 只有 6 个平铺链接 | 缺二级菜单、hover/focus 展开、当前项与关闭状态 |
| 移动端分级菜单 | 首页 HTML `120-166` 有一级项、二级列表和展开按钮 | 当前只有整体抽屉开/关 | 缺分级展开、返回/关闭、滚动锁定和焦点管理 |
| 导航滚动状态 | 旧页面以 `data-nav` 配合脚本切换 | 当前首页 40px 后变深色 | PARTIAL；缺按段落主题切色和复杂状态 |
| 搜索入口 | 旧 PC/移动导航均进入 `/search` | 当前导航无搜索 | 缺失 |
| 首屏 Loading | 首页 HTML `168-212` 有 Logo、SVG 遮罩、0-100% 和 91 帧 Canvas | 无 | 缺失 |
| 浮动客服 | 首页 HTML `24-32` 有悬浮二维码入口 | 无 | 缺失；公开内容需换自有客服资料 |
| 自定义光标 | 首页 HTML `1721-1724` | 无 | 缺失；移动端应禁用 |
| Footer 信息架构 | 旧 Footer 有多级导航、法律/隐私、备案和返回顶部 | 当前 Footer 只有 5 个链接和版权行 | 缺法律/隐私、分组导航、返回顶部和必要企业信息 |

### 5.2 首页

旧首页是 6 个 row 的滚动页面：

- Hero 有 4 个状态、页码、背景图组、88 帧 Canvas；页面加载另有 91 帧 Canvas。
- 品牌简介和使命使用滚动入场及图文位移。
- 五类业务场景包含全屋、酒店、商业、公共、特种；当前首页只有全屋、商业、公共、工业，酒店缺席。
- 业务区存在热点 `tabClick`、Swiper、产品展示、视频及场景切换。
- 资讯区为多组轮播/卡片状态。

当前首页是一张 Hero 背景图加 CSS 缩放/光束、4 个场景 hover 切图、静态智能中枢示意、4 张平台能力卡和 3 条链接。信息方向已经换成钜豪，但旧站的状态密度、滚动节奏、轮播和媒体切换均未复刻。

### 5.3 About / History / Join

- `/about` 旧页面包含企业简介、`SINCE` 叙事、价值观、荣誉轮播、渠道网络；当前 `/about` 只有 3 个亮点和 2 个正文段。
- `/about/history` 的大事记页面完全缺失。
- `/about/join` 的校招/社招入口和团队环境多组轮播完全缺失。

### 5.4 业务/方案页

五个旧业务页面共享 `article#business`，但各自有独立内容和产品数据。旧 HTML 直接证明：

- 双 Canvas 场景帧序列（例如全屋页 `194-199`）。
- 空间热点 `tabClick`。
- 场景/品类 Tab 和多个 Swiper 产品组。
- 产品卡片 `goPop` 与 `data-id`。
- 产品弹层 `.proPop`，包含标题、参数、主图和详情长图（全屋页 `818-843`）。
- 部分页面有桌面视频与移动端 jsmpeg Canvas。

当前四个 `/solutions/*` 页面全部是通用文字模板：没有产品类型、产品数据、图片组、场景热点、产品卡片、弹窗、视频或轮播；酒店也没有独立路由。

### 5.5 健康照明与 ESG

- 旧 `/healthy` 有 7 个内容 row、多组桌面/移动 Swiper，并有针对滚动位置和 slideChange 的内联逻辑。
- 旧 `/esg` 有 11 个内容 row、多组 Swiper、前后按钮和 `#popImg` 图片放大层。
- 当前没有任一独立页面，亦没有对应的可持续内容模型。

### 5.6 服务支持

旧 `/service` 至少包含：

- 售后政策和产品质保分类 Tab/表格。
- 14 条以上 FAQ、逐项展开与“加载更多”状态。
- 省份 → 城市 → 门店的联动查询和门店列表；HTML `700-897` 给出选择器及两端列表容器。
- 防伪说明、桌面视频/移动 Canvas、热线及二维码入口；HTML `899-940`。

当前没有 `/service`，`/contact` 也没有表单、门店、质保、FAQ 或售后流程。

### 5.7 招商合作

旧 `/investment` 包含门店招商类型、移动轮播、运营五大体系、时钟/时间轴、区域联系人选择、五金网点招商、三大保障/九大支持 Tab 和多组轮播。当前 `/mall` 与 `/contact` 只有渠道方向文案，不包含招商决策信息和任何查询/表单状态。

### 5.8 新闻、搜索、下载、法律

- 当前 `/news` 是通用内容页，不是可浏览的文章列表；两篇文章只在正文 bullets 和 related 链接中出现。
- 旧新闻有搜索框、内容卡片、分页和详情；当前无分类、搜索、分页、加载/空状态和附件展示。
- `/search` 完全缺失；旧表单明确为 `GET /search?keywords=`。
- `/download` 完全缺失；旧列表支持详情展开和实际下载链接。
- `/law`、`/privacy` 完全缺失，当前 Footer 也没有入口。

## 6. 交互与动效覆盖

### 6.1 当前已存在

- 首页导航滚动超过 40px 后切换样式。
- 移动端一级导航整体展开/收起。
- 首页 4 个场景支持 mouseenter、focus 和触屏首次点击切换。
- 卡片和链接 hover 反馈。
- 全屋方案页与智能家居页使用原生 `<details>` FAQ。
- `prefers-reduced-motion: reduce` 时禁用动画与过渡。

### 6.2 旧证据存在、当前缺失

| 交互族 | 旧证据 | 当前 |
|---|---|---|
| 加载与首屏时序 | `#load`、进度、91 帧 Canvas；Hero 88 帧 Canvas | 无加载状态；只有 CSS 背景缩放/光束 |
| 滚动入场与段落编排 | 大量 `.scroll-animate`、`data-effect`、`data-nav`、TweenMax | 无统一滚动观察器或 GSAP timeline |
| PC/移动导航状态机 | 二级菜单、抽屉二级展开、搜索入口 | 只有平面菜单开/关 |
| 轮播 | 首页、About、Join、Business、Healthy、ESG、Investment | 无 Swiper 或自建 Carousel |
| Canvas/WebGL 转场 | `three.js`、EffectComposer、ShaderPass、`glSlider`、帧序列 Canvas | 无 canvas/WebGL |
| 视频切换 | mp4、jsmpeg、桌面/移动媒体双路径 | 无视频 |
| 场景热点 | `tabClick` 场景定位点 | 只有整张场景标签切换 |
| 产品列表/展开 | 品类 Tab、Swiper、继续加载 | 无产品数据与列表 |
| 产品弹窗 | `.goPop` → `POST /brand` → `.proPop` | 无 |
| 服务 FAQ | 动画展开、更多 5 条 | 仅少数原生 details，且不在服务页 |
| 门店查询 | 省 → 城市 → 门店，`POST /service` | 无 |
| 招商查询 | 区域 → 联系人，`POST /investment` | 无 |
| 新闻搜索/分页 | 搜索输入、分页 URL | 无 |
| 下载反馈 | 详情展开、下载按钮 | 无 |
| 返回顶部/自定义光标 | Footer `.toTop`、cursor group | 无 |

旧 bundle 可直接确认的调用痕迹：

- `POST /brand`：`get_products_home` + `products_id`
- `POST /service`：`get_city` + `province`
- `POST /service`：`get_shop` + `city`
- `POST /investment`：`get_agent` + `province`
- 旧代码通过 `eval("(" + res + ")")` 解析返回；新工程不应延续该方式，应使用统一 JSON API 适配层。

## 7. 可维护性目标与当前架构差距

| 目标工程能力 | 当前状态 | 缺口 |
|---|---|---|
| Next.js + TypeScript | 已有 | 保留 |
| 按路由拆分页面 | 只有首页独立；其余 12 页共用一个模板 | 缺 feature-specific 页面与组件 |
| 设计变量 | 只有少量全局色值变量 | 缺字号、间距、断点、层级、缓动、时长等完整 tokens |
| CSS Modules | 未使用；全部在 `globals.css` | 页面样式无法按域隔离 |
| GSAP 动效框架 | 依赖中不存在 | 缺 timeline、ScrollTrigger、matchMedia 和卸载清理约定 |
| 通用 UI | 仅 Header/Footer | 缺 Button、PageHero、Tabs、Carousel、Accordion、Dialog、Pagination、Form 等 |
| 业务 feature | 不存在 `features/*` | About、News、Service、Investment、Business、ESG、Download、Search 均未拆分 |
| 本地内容层 | 单个 `pages.ts` 混合 SEO 与页面正文 | 缺产品、新闻、下载、地区/门店、招商等独立类型与 fixtures |
| Mock/API 适配层 | 无 | 页面无法逐步从 Mock 切到目标 API |
| 动效降级 | 有全局 CSS reduce-motion | 复杂 JS 动效尚未建立，因此也没有 JS 动效降级/清理测试 |
| SEO 路由验证 | 有 metadata/sitemap/robots | 缺 23 页面族映射、分页 canonical、搜索 noindex 策略等 |
| 测试 | 只抽查 5 个页面、sitemap/robots/404 | 缺全路由、交互、响应式、console、视觉和无障碍验证 |

当前 `package.json` 只有 React/Next/Drizzle 等依赖，没有 GSAP、Swiper 或等价动画/轮播方案。当前 `public/` 只有 5 张 JPG、1 张 PNG 和 4 个 SVG，且多页反复复用 4 张场景图；这能支撑原型，但无法支撑旧页面的图像层级、场景变化和媒体叙事。后续必须换成钜豪自有或已授权素材，不能直接把镜像资源作为上线素材。

## 8. 旧证据不能证明的事项

以下事项必须标为 **NOT PROVEN**，不能从旧路由 JSON 或静态 HTML 直接推断为现状或需求定值：

1. 2026-07-06 之后当前线上 NVC 是否新增、删除或修改路由、页面模块和交互。
2. 1440、768、390 三档当前线上页面的实际像素布局、裁切、字体加载和动画帧表现。
3. hover、click、wheel、touch、drag、自动轮播、视频结束等状态的准确时序和边界；HTML 类名只能证明结构存在。
4. WebGL/Canvas 的准确 shader、uniform、坐标、速度和降级结果；必须运行时捕获并逐帧对照。
5. 旧 Ajax 接口的完整响应 schema、错误码、空数据、并发、缓存、鉴权、限流和可用性。
6. 原站数据库/CMS 表结构。页面字段和接口参数只能支持数据模型推断，不能证明数据库事实。
7. 钜豪真实的品牌历史、招聘岗位、门店、服务政策、招商联系人、ESG 数据、软件下载、电话、地址及法律文本。
8. 旧镜像素材的版权/授权范围。文件存在不等于可以在 JUHAO 公网重新发布。
9. 外部“产品中心”和采购合作子站的完整页面范围；旧 route crawl 只覆盖主域同站链接。
10. 当前工作树的实际浏览器性能、Lighthouse、键盘可用性和所有响应式状态；本次未启动浏览器验收。

## 9. 建议优先级

### P0：先固定真实基线和路由契约

1. 对当前线上原站重新执行 route crawl、三档截图、interaction probe 和 network capture；把旧快照保留为历史证据，不直接当最终验收基线。
2. 产出一张“旧页面族 → JUHAO 正式 URL → 组件模板 → 内容来源 → 是否需 redirect/alias”的路由契约。
3. 先给缺失页面建可访问骨架：History、Join、Hotel、Healthy、ESG、Service、Investment、Download、Search、Law、Privacy、新闻分页/详情族。
4. 将通用 catch-all 仅保留给真正同构的内容页；业务页、服务页、招商页、新闻列表和搜索页改为独立 feature 页面。

### P1：用业务/产品页验证核心架构

1. 建立 `Product`、`ProductCategory`、`Scene`、`ProductDetail` 类型和本地 fixtures。
2. 实现一个完整业务页纵切：Hero → Canvas/媒体叙事 → 场景热点 → 分类 Tab → 产品列表/轮播 → 产品弹窗。
3. 加入统一 Motion 基础：GSAP context/cleanup、ScrollTrigger、响应式 matchMedia、reduced-motion。
4. 产品弹窗先接 Mock adapter，不复用旧 `/brand` 接口；后续只替换 adapter。

### P1：补全全站状态机

1. PC 二级导航和移动端分级抽屉。
2. Loader、按段落导航配色、返回顶部、焦点管理、滚动锁定和页面切换清理。
3. Carousel、Tabs、Accordion、Dialog 的通用可访问组件。

### P2：补数据型页面

1. Service：售后政策、FAQ、门店省市联动、空/错/加载状态。
2. Investment：招商类型、体系、区域联系人和咨询入口。
3. News/Search：列表、分类、搜索、分页、详情、附件、空状态。
4. Download：筛选、版本/大小/日期、展开、失效文件和下载反馈。
5. ESG/Healthy：长页滚动叙事、轮播和图片放大层，全部换成已核实自有内容。

### P3：验收与发布审计

1. 390/768/1440 每路由截图对照。
2. 交互矩阵逐项浏览器验证，检查 console、失效资源和动画卸载。
3. 全路由 SEO、canonical、分页/搜索策略、404、sitemap 验证。
4. 原站域名、品牌、统计脚本、受保护素材和未核实企业信息扫描。

## 10. 权威证据索引

### 当前工作树

- `app/_data/pages.ts:20-117`：当前 12 个内页 URL 和内容注册表。
- `app/[...slug]/page.tsx:11-54`：全部注册内页共用的渲染模板。
- `app/page.tsx:7-72`：当前首页模块和唯一的场景状态交互。
- `app/_components/SiteHeader.tsx:5-33`：当前平面导航、滚动变色、移动菜单开关。
- `app/_components/SiteFooter.tsx:1-9`：当前最小 Footer。
- `app/globals.css:3-5`、`app/globals.css:9-80`：当前 CSS 动效、响应式、focus 和 reduced-motion。
- `app/sitemap.ts:4-8`：当前 sitemap 由首页和注册表生成。
- `package.json:16-38`：当前依赖，不含 GSAP/Swiper。
- `tests/rendered-html.test.mjs:18-53`：当前仅抽查 5 个页面及 discovery/404。

### 旧镜像

- `RECON/routes/original-route-map.json:4`：旧抓取时间。
- `RECON/routes/original-route-map.json:10-2191`：23 个 HTML 路由记录。
- `site/index.html:28-166`：PC/移动导航和二级菜单。
- `site/index.html:168-212`：加载器和帧序列 Canvas。
- `site/index.html:213-1510`：首页主体、业务、产品和资讯模块。
- `site/index.html:1688-1708`：法律、隐私和返回顶部。
- `site/index.html:1728-1744`：旧页面动效/媒体依赖。
- `site/about/index.html:168-390`：企业简介、价值、荣誉、渠道模块。
- `site/about/history/index.html:168-335`：大事记内容结构。
- `site/about/join/index.html:168-510`：招聘入口和环境轮播。
- `site/brand/whole_house/index.html:168-700`：场景 Canvas、热点、Tab、产品与优势。
- `site/brand/whole_house/index.html:818-843`：产品弹层结构。
- `site/healthy/index.html:199-760`：健康照明长页与轮播结构。
- `site/esg/index.html:594-1455`、`1578-1588`：ESG 多轮播和图片放大层。
- `site/service/index.html:220-450`：售后政策分类/表格。
- `site/service/index.html:473-696`：FAQ 展开内容。
- `site/service/index.html:700-940`：门店查询、防伪和售后入口。
- `site/investment/index.html:185-565`：招商类型、体系、区域、Tab 和轮播。
- `site/news/index.html:168-310`：新闻列表和搜索。
- `site/search/index.html:168-200`：GET 搜索表单。
- `site/download/index.html:168-310`：下载项、详情展开和文件链接。
- `site/law/index.html:168-190`、`site/privacy/index.html:168-190`：法律与隐私页面。
- `site/templates/dist/js/app.min.js`：`initFn`、`homeFn`、`aboutFn`、`serviceFn`、`investFn`、`businessFn`、`Vfn`、`glSlider` 以及 4 个 Ajax 调用痕迹。
