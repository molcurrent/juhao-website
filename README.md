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

## 工程边界

- `app/`：路由入口、metadata、sitemap、robots 与 404。
- `components/layout/`：桌面/移动导航和页脚。
- `components/motion/`：Loader、全站 reveal 与 WebGL 首屏转场。
- `components/ui/`：可访问 Carousel。
- `features/`：首页、关于、解决方案、智能家居、服务、合作、新闻、搜索、商城、联系、可持续、下载与法律页面。
- `lib/api/`：统一 `SiteApi` 接口与本地 Mock；页面不调用原 NVC 接口。
- `styles/tokens.css`：品牌颜色、排版、空间、时长与层级变量。
- `RECON/`：路由契约、动效清单、取证结论和预发布验收报告。原始浏览器证据只留本地，不进入 Git 或发布包。

## SEO 策略

- 目标规范域为 `https://juhao.com`。
- 每个正式页面独立输出 title、description、canonical、Open Graph 和 SSR 正文。
- 文章页输出 Article JSON-LD；可见 FAQ 与 FAQPage 数据使用同一来源。
- 待企业核验的页面保持 `noindex, follow`，不进入 sitemap，也不输出页面级结构化数据。
- 原 `/brand/**`、`/healthy`、`/esg`、`/investment`、`/download`、`/law` 和旧数字新闻路径使用 308 迁移。

## 数据与发布安全

`SiteApi` 支持本地 Mock 和正式 HTTP/CMS 两种适配器，覆盖产品、服务地区、网点、合作区域、搜索、新闻、下载与咨询提交。复制 [.env.example](.env.example) 并配置接口根路径即可切换；字段、响应和服务端安全要求见 [API 契约](RECON/API_CONTRACT.md)。未配置时继续使用 Mock，且咨询提交保持关闭。

以下信息在企业确认前不得改成可索引正式内容：

- 品牌历史与招聘职位；
- 产品型号、参数和检测声明；
- 门店、联系方式和服务政策；
- 招商区域、联系人和合作权益；
- ESG 指标、报告与案例；
- 下载文件、法律声明和隐私政策；
- 咨询表单的真实提交与存储。

阶段状态、已测范围和上线缺口见 [预发布验收报告](RECON/PRE_RELEASE_ACCEPTANCE.md)。
