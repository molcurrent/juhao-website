# JUHAO 官网复刻审计说明

## 项目定位

- 原始参考来源：<https://www.nvc-lighting.com.cn/>
- 本轮实时抓取日期：2026-07-12（Asia/Shanghai）
- 实现模式：`content remix + visual clone`。以原站的页面层级、视觉比例、交互状态和动效节奏作为证据，重新实现为 JUHAO 官网。
- 复杂度：L5。原站同时包含多页面 CMS、Three.js / ShaderPass、Canvas / JSMpeg、Swiper、TweenMax 和页面级 Ajax 状态，不适合按普通静态落地页处理。

## 授权与内容边界

原站页面仅用于证明结构、版式、响应式行为、交互状态和动效机制。公开版本必须使用 JUHAO 自有品牌标识、自有文案和已获授权素材，不复制原站商标、新闻正文、产品数据、门店数据、招商联系人、法律文本或受保护媒体。

取证目录中的截图、网络记录和下载资源是内部审计材料，不是上线素材库。无法确认授权的内容默认不得进入生产包。

## 当前工程事实

- 当前代码基线是已存在的 Sites 工程，使用 Next.js 16、React 19、TypeScript 和 vinext，不另建平行项目。
- 当前实现包含首页和 23 个内页；现有 canonical 路由均命中独立 feature，catch-all 只负责路由分发与防御性兜底。
- 页面通过统一 adapter 隔离 Mock 数据和未来 CMS 数据；未核验的业务页保持 `noindex`，不输出页面级结构化数据。
- Coze CLI 已安装，当前未登录；未读取或创建 Coze 项目，因此不存在第二套代码基线。

## 本地运行与检查

环境要求：Node.js 22.13.0 或更高版本。

```bash
npm install
npm run dev
npm run build
npm test
npm run lint
```

`npm test` 会先执行生产构建，再运行 `tests/rendered-html.test.mjs` 的渲染 HTML 检查。`npm run start` 可用于启动已构建版本。

## 当前阶段与已完成取证

当前已完成阶段 0–4，并进入阶段 5 数据核验与阶段 6 预发布验收。已经完成或形成的证据包括：

- 首页 1440、768、390 三档视口截图和运行时侦察数据；
- 25 条浏览器内链页面抓取，以及 64 条实时 sitemap URL 的漂移审计；
- 首页网络请求记录、素材清单和原站前端依赖识别；
- 原站核心 JS、CSS 与旧镜像哈希一致性的核验；
- `/brand`、`/service`、`/investment` 四类只读 POST 返回结构的记录；
- loader、导航、滚动、轮播、Canvas / WebGL、FAQ、区域联动等动效与交互清单；
- 原站页面族到 JUHAO canonical URL 的路由契约；
- 原站 source map 可用性检查和 WebGL baseline 证据范围。

阶段 0 的核心结论是：旧压缩前端产物仍可作为当前交互证据，但实时 CMS 内容、新闻路由和上传素材已经漂移，必须以本轮实时抓取结果为准。

## 路由契约摘要

完整契约见 `RECON/ROUTE_CONTRACT.md`。正式路由按以下页面族实现：

| 页面族 | JUHAO canonical | 兼容原则 |
|---|---|---|
| 首页 | `/` | 保留 |
| 品牌与发展 | `/about`、`/about/history`、`/about/join` | 独立页面，不使用通用模板冒充 |
| 解决方案 | `/solutions`、`/solutions/residential`、`/solutions/hospitality`、`/solutions/commercial`、`/solutions/public`、`/solutions/industrial` | 原 `/brand/**` 仅 redirect |
| 健康光 | `/healthy-light` | 原 `/healthy` redirect |
| 可持续发展 | `/sustainability` | 原 `/esg`、`/about/duty` redirect；不复制原站错误页面 |
| 服务支持 | `/service` | 保留，数据经 adapter 提供 |
| 合作伙伴 | `/partners` | 原 `/investment` redirect |
| 新闻 | `/news`、`/news/page/:page`、`/news/[slug]` | 只发布自有文章；原数字详情不复制正文 |
| 搜索 | `/search?keywords=` | 本地索引 adapter；结果页按策略设置 noindex/follow |
| 下载 | `/downloads` | 原 `/download` redirect |
| 法律与隐私 | `/legal`、`/privacy` | 只使用审核通过的 JUHAO 文本 |

原站产品中心、商城、SRM、微信文章等外部域不属于本次主站路由，也不得被代理或复刻。

## 验证清单

每一阶段合入前至少核对：

- [ ] canonical、metadata、Open Graph、结构化数据和 sitemap 与路由契约一致；
- [ ] 旧路径只作为 redirect 或 alias，不产生重复 canonical 页面；
- [ ] 1440、768、390 三档视口的布局、导航和主要交互可用；
- [ ] 键盘焦点、移动菜单、弹窗关闭、表单提示和 reduced-motion 有明确状态；
- [ ] loader、滚动入场、轮播、Canvas / WebGL 等效果均有可访问的静态或低动效降级；
- [ ] Mock API 和未来 CMS 共用同一视图 adapter，页面组件不直接调用原站接口；
- [ ] 搜索、筛选、分页、FAQ、区域选择和表单具备空态、错误态及成功态；
- [ ] `npm run lint`、`npm run build`、`npm test` 全部通过；
- [ ] 逐路由检查可见内容、HTTP 状态、控制台错误和关键网络请求；
- [ ] 上线包经过域名、追踪代码、接口地址、商标、字体、图片、视频和 PDF 扫描。

## 已知未证明事项

- 实时 sitemap 不是完整路由真相：它包含错误拼接 URL，也漏列多个可访问功能页。
- 25 条内链抓取不代表 sitemap 中全部新闻详情均已完成视觉和交互检查。
- 原站未提供可信可用的 source map；复杂 WebGL / Canvas 实现只能由运行时、压缩产物和视觉 baseline 交叉还原。
- 现有页面域已经拆分；产品弹窗、门店查询、合作区域、搜索、下载空态与联系预检均有独立模块。
- JUHAO 的历史、招聘、门店、招商、ESG、下载和法律信息在正式内容确认前只能使用明确标注的 Mock 或发布说明，不能进入正式结构化数据。
- 本地性能、基础无障碍、SEO 全量路由和三档 Chromium 已形成预发布验收；公网 Lighthouse、真实设备与其他浏览器仍待正式域名接入后复核。

## 上线门槛

只有同时满足以下条件才允许发布正式版本：

1. 生产构建中不包含 CNZZ 或任何原站统计、追踪与广告代码；
2. 生产 HTML、JS、CSS、配置和数据中不包含原站域名及其子域名；
3. 客户端和服务端不请求原站页面、Ajax 接口、媒体地址或下载地址；
4. 所有商标、字体、图片、视频、PDF、文章和产品资料均属于 JUHAO、已获授权，或具有明确可用许可证；
5. 页面文案、结构化数据、联系人、门店、招商、法律与隐私内容经过业务审核；
6. 完成路由契约、三档响应式、交互降级、SEO、性能、无障碍、构建和自动化测试验收；
7. 发布包的最终扫描结果为：原站域名 0、原站接口 0、CNZZ 0、未授权素材 0。

在上述门槛全部满足前，任何原站截图、抓取资源和接口样本都只能留在内部 `RECON` 证据范围，不得进入公开部署产物。
