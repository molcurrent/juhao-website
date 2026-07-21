# JUHAO 钜豪照明多页官网

基于 Next.js、React、TypeScript、GSAP、CSS Modules 和 vinext 的服务端渲染企业官网。页面结构与交互节奏参考 NVC 访客侧官网的实时证据重新实现；公开代码、文案和图片使用 JUHAO 自有版本，不依赖原站接口或素材。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
npm run lint
npm test
```

`npm test` 会先执行 production build，再验证服务端正文、canonical、robots、sitemap、JSON-LD、旧路由迁移和 404。

日常 `npm run build` 只核对仓库内已冻结产物，保证构建不受仓库外知识库实时变化影响。需要显式核对外部来源时运行 `npm run check:sources`；准备公开发布时运行 `npm run check:release`，它会逐项检查人工签核、公开索引、规范主域名与咨询入口配置。外部来源不可用或发生漂移、发布条件未签核时，相应审计命令按设计返回失败，且不会改写冻结或审批数据。

## 工程边界

- `app/`：路由入口、metadata、sitemap、robots 与 404。
- `components/layout/`：桌面/移动导航和页脚。
- Footer 按品牌、照明方案、服务合作、内容联系与法律信息分组，并避免发布未经企业核验的备案和联系方式。
- 桌面与移动导航均提供站内搜索入口；移动抽屉包含首焦点、Tab 循环、Esc 关闭、背景 inert 和焦点回送。
- `components/motion/`：Loader、全站 reveal 与 WebGL 首屏转场。
- 全站提供家庭健康光、工程项目和渠道合作三类咨询快捷入口，记录来源、场景与意图；同时保留滚动后返回顶部和 reduced-motion 路由过场降级。
- `components/ui/`：可访问 Carousel；首页资讯与关于页品牌场景共用键盘、触摸、自动播放、暂停和 reduced-motion 行为。
- `features/`：首页、关于、解决方案、智能家居、服务、合作、新闻、搜索、商城、联系、可持续、下载与法律页面。
- `lib/api/`：仅保留同源咨询提交及其运行时校验；内容直接读取本地治理数据。
- `styles/tokens.css`：品牌颜色、排版、空间、时长与层级变量。
- `RECON/`：路由契约、动效清单、取证结论和预发布验收报告。原始浏览器证据只留本地，不进入 Git 或发布包。

## SEO 策略

- 目标规范域为 `https://juhao.com`。
- 每个正式页面独立输出 title、description、canonical、Open Graph 和 SSR 正文。
- 文章页输出 Article JSON-LD；可见 FAQ 与 FAQPage 数据使用同一来源。
- 资讯列表使用 `/news`、`/news/page/2`、`/news/page/3` 独立 SSR 页面；第一页别名重定向到 `/news`，越界页码返回 404。
- 待企业核验的页面保持 `noindex, follow`，不进入 sitemap，也不输出页面级结构化数据。
- 原 `/brand/**`、`/healthy`、`/esg`、`/investment`、`/download`、`/law` 和旧数字新闻路径使用 308 迁移。

## 数据与发布安全

产品、服务、搜索与资讯由本地治理数据直接提供；咨询回访独立使用同源 `/api/contact`，先写入 Sites D1，再按可选的服务端 Webhook 通知内部接收端。字段与安全边界见 [API 契约](RECON/API_CONTRACT.md)。

公开咨询入口必须同时配置 Turnstile 允许主机名，并在 Cloudflare 边缘/WAF 完成前置限流验收后将 `CONTACT_EDGE_RATE_LIMIT_VERIFIED=true`。D1 限流只统计已通过 Turnstile 的业务提交，不能替代边缘抗滥用规则；未验收时发布门禁和运行时接口都会保持关闭。

以下信息在企业确认前不得改成可索引正式内容：

- 品牌历史与招聘职位；
- 产品型号、参数和检测声明；
- 门店、联系方式和服务政策；
- 招商区域、联系人和合作权益；
- ESG 指标、报告与案例；
- 下载文件、法律声明和隐私政策；
- 企业微信客服入口和内部通知接收端。

阶段状态、已测范围和上线缺口见 [预发布验收报告](RECON/PRE_RELEASE_ACCEPTANCE.md)。
