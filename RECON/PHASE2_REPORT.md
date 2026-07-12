# 阶段 1–2 完成报告

> 本文保留为阶段 1–2 当时的历史快照；当前路由、测试与发布状态以 [PRE_RELEASE_ACCEPTANCE.md](PRE_RELEASE_ACCEPTANCE.md) 为准。

- 核对日期：2026-07-12
- 核对范围：当前工作树、服务端渲染测试和本地 Playwright 三档浏览器检查
- 结论：阶段 1 的工程底座与阶段 2 的 canonical 路由/页面域拆分已达到当前验收线；这不代表阶段 3–6、生产审计或发布完成。

## 1. Canonical 路由与旧路径兼容

当前公开信息架构由首页和 23 个内页组成，共 **24 个 canonical 页面**。页面数据来源见 [app/_data/pages.ts](../app/_data/pages.ts) 与 [app/_data/contract-pages.ts](../app/_data/contract-pages.ts)，内页分发见 [app/[...slug]/page.tsx](../app/%5B...slug%5D/page.tsx)。

| 页面域 | Canonical 路由 | 实现 |
|---|---|---|
| 首页 | `/` | [app/page.tsx](../app/page.tsx) |
| 关于钜豪 | `/about`、`/about/history`、`/about/join` | [features/about/AboutPages.tsx](../features/about/AboutPages.tsx) |
| 方案总览与健康光 | `/solutions`、`/healthy-light` | [features/solutions/SolutionsPages.tsx](../features/solutions/SolutionsPages.tsx) |
| 五类场景方案 | `/solutions/residential`、`/solutions/hospitality`、`/solutions/commercial`、`/solutions/public`、`/solutions/industrial` | [features/business/BusinessScenePage.tsx](../features/business/BusinessScenePage.tsx) |
| 智能家居 | `/smart-home` | [features/smart-home/SmartHomePage.tsx](../features/smart-home/SmartHomePage.tsx) |
| 商城与联系 | `/mall`、`/contact` | [features/platform](../features/platform/) |
| 服务支持 | `/service` | [features/service/ServicePage.tsx](../features/service/ServicePage.tsx) |
| 可持续发展 | `/sustainability` | [features/sustainability/SustainabilityPage.tsx](../features/sustainability/SustainabilityPage.tsx) |
| 合作共创 | `/partners` | [features/partners/PartnersPage.tsx](../features/partners/PartnersPage.tsx) |
| 新闻资讯 | `/news`、`/news/healthy-home-lighting`、`/news/smart-lighting-planning` | [features/news/NewsPage.tsx](../features/news/NewsPage.tsx) |
| 搜索 | `/search` | [features/search/SearchPage.tsx](../features/search/SearchPage.tsx) |
| 下载、法律与隐私 | `/downloads`、`/legal`、`/privacy` | [features/utility/UtilityPages.tsx](../features/utility/UtilityPages.tsx) |

当前 `pages` 中的 23 个内页键均命中明确的 feature 分支；保留的 `GenericPage` 只是兜底，现有 canonical 页面不依赖它。`/about/history`、`/about/join`、`/downloads`、`/search`、`/legal`、`/privacy` 共 6 页设置为 `noindex, follow`，因此 [app/sitemap.ts](../app/sitemap.ts) 当前输出 **18 个 URL**（首页加 17 个可索引内页）。[app/robots.ts](../app/robots.ts) 指向 `https://www.juhao.com/sitemap.xml`。

[next.config.ts](../next.config.ts) 配置了 **13 条永久重定向规则**：

| 旧路径 | JUHAO canonical |
|---|---|
| `/about/duty` | `/sustainability` |
| `/brand` | `/solutions` |
| `/brand/whole_house` | `/solutions/residential` |
| `/brand/hotel` | `/solutions/hospitality` |
| `/brand/business` | `/solutions/commercial` |
| `/brand/public` | `/solutions/public` |
| `/brand/special` | `/solutions/industrial` |
| `/healthy` | `/healthy-light` |
| `/esg` | `/sustainability` |
| `/investment` | `/partners` |
| `/download` | `/downloads` |
| `/law` | `/legal` |
| `/news/:id(\d+)` | `/news` |

自动测试实际抽查了其中 8 条并确认返回 `308` 和正确 `Location`；数字新闻规则作为一个路径族配置，不把 NVC 的数字详情页复制为 JUHAO 内容。

## 2. 阶段 1 工程底座

- **Design tokens**：颜色、字体、内容宽度、页边距、动效时长/缓动与层级集中在 [styles/tokens.css](../styles/tokens.css)，全站由 [app/globals.css](../app/globals.css) 引入。
- **Layout**：桌面/移动导航和 Footer 已拆到 [components/layout](../components/layout/)，旧的 `app/_components` 仅保留轻量 re-export，避免一次性改动所有调用方。当前 feature、layout 与 motion 共使用 15 个 CSS Modules 文件。
- **Loader**：[components/motion/PageLoader.tsx](../components/motion/PageLoader.tsx) 在首页首次会话展示，使用 `sessionStorage` 控制单次播放；`prefers-reduced-motion: reduce` 时跳过。
- **导航**：[components/layout/SiteHeader.tsx](../components/layout/SiteHeader.tsx) 已实现桌面 hover/focus 二级菜单、移动端抽屉与子菜单、滚动白底状态、遮罩、页面滚动锁定及 `Escape` 关闭。当前验收只证明这些已测路径可用，不等同于完成全量无障碍审计。
- **GSAP**：[lib/motion/gsap.ts](../lib/motion/gsap.ts) 统一注册 `gsap`、`@gsap/react` 与 `ScrollTrigger`；[components/motion/SiteMotion.tsx](../components/motion/SiteMotion.tsx) 负责路由级 reveal 和清理。Loader、移动抽屉、商业场景页与智能家居页已使用 `useGSAP`，并处理 reduced motion。依赖版本为 `gsap ^3.13.0`、`@gsap/react ^2.1.2`。
- **Mock API**：[lib/api/types.ts](../lib/api/types.ts) 定义 `ProductCard`、`ServiceRegion`、`ServiceLocation`、`PartnerRegion` 与 `SiteApi`；[lib/api/mock.ts](../lib/api/mock.ts) 提供同接口 Mock。商业产品、服务省市/网点和合作区域页面通过 [lib/api/index.ts](../lib/api/index.ts) 使用该 adapter，没有调用 NVC 接口，也没有 `eval` 解析。

## 3. 原创资产替换与哈希

旧的 `hero.jpg`、`home.jpg`、`business.jpg`、`public.jpg`、`industrial.jpg` 已核对命中 NVC 镜像哈希并从 `public/images` 删除。当前五张场景主视觉为全新生成的 JUHAO WebP，生成和人工筛查记录见 [RECON/JUHAO_ASSET_PROVENANCE.md](JUHAO_ASSET_PROVENANCE.md)。

| 文件 | SHA-256 |
|---|---|
| `public/images/juhao-hero.webp` | `8887e67c4225d2f2c6111962ec94ec709120b0585752fedb8d6ff3a5d6d93cbf` |
| `public/images/juhao-home.webp` | `61b7d810904d6bd25fa6706b899c44f24ddaff3e277d262427062a3915983319` |
| `public/images/juhao-commercial.webp` | `935549cc919aa16798ef63356f4b1b7e7ff94b2ffa8fc8a3533172368c1d6c02` |
| `public/images/juhao-public.webp` | `96a3f0cc5b90737258fba1ce3abb74ed1bcb01e88ce88a64ea047b185a0b8bad` |
| `public/images/juhao-industrial.webp` | `9550826fac21e36969e4293eebddbb1b72ec5fc646740de455cd3bfc309af158` |

五张文件与本地 NVC 镜像及实时取证素材的 SHA-256 匹配数为 **0**。当前 `app/`、`components/`、`content/`、`features/`、`lib/`、`public/`、`styles/` 中也未检出 `nvc-lighting`、`雷士`、`cnzz`、`upfiles` 或 `templates/dist` 残留；生产发布前仍需再次执行全量扫描。

## 4. 代码与服务端测试结果

本报告生成前在当前工作树重新执行：

| 检查 | 结果 |
|---|---|
| `./node_modules/.bin/tsc --noEmit` | 通过，退出码 0 |
| `npm run lint` | 通过，退出码 0 |
| `npm test` | vinext production build 通过；Node 测试 6/6 通过，0 失败 |

[tests/rendered-html.test.mjs](../tests/rendered-html.test.mjs) 覆盖了代表性多页 SSR 正文、canonical/metadata/JSON-LD、15 条 canonical 访客路由契约、独立 feature 标记、6 个 `noindex` 页面、sitemap/robots、8 条旧路径重定向和品牌化 404。它证明当前断言范围通过，不应解读为逐页视觉或全量生产验收。

## 5. Playwright 三档实际验收

[work/visual_check.py](../work/visual_check.py) 已在本地开发服务器实际跑通以下三档：

| 视口 | Loader | Console errors | Page errors | HTTP `>=400` responses |
|---|---:|---:|---:|---:|
| `1440 × 900` | 已看到并正常退出 | 0 | 0 | 0 |
| `768 × 1024` | 已看到并正常退出 | 0 | 0 | 0 |
| `390 × 844` | 已看到并正常退出 | 0 | 0 | 0 |

每档实际访问 15 个页面/状态：`/`、酒店场景、商业场景、服务、关于、历程、方案总览、健康光、智能家居、商城、可持续、合作、新闻、联系、带关键词的搜索。通过的交互包括：

- 1440 桌面导航 hover 后显示“酒店照明”二级入口；768 与 390 打开移动抽屉、展开“服务支持”子菜单并看到“资料下载”。
- 商业页打开/关闭产品详情原生 `dialog`，看到“资料说明”，关闭后焦点回到原“查看详情”按钮。
- 服务页完成“华南 → 广州”Mock 查询并显示“交互示例 · 非正式网点”，FAQ 展开后 `aria-expanded="true"`。
- 智能家居切换“观影”Tab，`aria-selected="true"` 且对应内容可见。
- 联系页空表单预检显示“还可以补充一些信息”；组件只执行本地规则判断，没有提交后端。
- `/search?keywords=健康光` 返回目标文章；页面保持 `noindex, follow`，canonical 为 `https://www.juhao.com/search`。

对应截图保存在 [work/browser-check](../work/browser-check/)。这组结果是功能与运行时检查，不是与原站逐像素对比。

## 6. 明确未完成的阶段 3–6 工作

以下项目尚未完成，因此当前版本不能标记为全量复刻完成或生产就绪：

1. **WebGL baseline**：尚未实现或校准原站 Canvas/WebGL 图像转场，也没有完成 1440/768/390、DPR 1/2 的五关键帧对照与性能验收。
2. **轮播体系**：About、News、Investment/Partners 等原站 Swiper 级轮播、计数器、拖拽和触摸等价交互仍未重建；当前多处采用静态网格或 Tab。
3. **逐页视觉差异**：页面已拆成独立 feature，但仍复用五张场景图和部分版式语言；尚未完成全部路由与原站的桌面/平板/移动逐页视觉对比、关键动效节拍和极端内容验证。
4. **真实 CMS/API 与企业内容核验**：当前产品、地区、服务点、合作区域均为 Mock；发展历程、招聘、产品参数、门店、合作政策、ESG 数据、下载文件、联系方式、法律/隐私文本及企业主体信息仍需钜豪一手资料确认。搜索仍为本地页面索引，联系表单没有后端。
5. **生产审计与发布**：尚未完成 Lighthouse/真实设备性能、完整 WCAG、全路由 SEO crawl、依赖安全处置、缓存/CDN、监控、表单安全、全量版权/哈希复扫和发布后回归；本阶段改动也尚未作为生产版本发布。

因此，阶段 1–2 的结论是“工程底座与页面域/路由结构可继续迭代”，不是“阶段 3–6 已完成”。
