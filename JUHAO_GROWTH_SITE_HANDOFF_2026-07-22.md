# JUHAO 品牌增长型官网交接摘要

- 交接时间：2026-07-22（Asia/Shanghai）
- 工作目录：`/Users/mac/Documents/Codex/2026-07-12/sites-plugin-sites-openai-bundled-3`
- 当前分支：`main`
- HEAD：`e9801851da3578fda3e393b78c23f3b504681e57`（`Fix homepage eyebrow contrast`）
- 工作区状态：大量本地改动尚未提交；本轮没有提交、推送或部署。
- 本地预览：最后一次确认地址为 `http://localhost:4173`。

> 本文件记录的是 2026-07-22 停止工作时的本地状态。它不能替代正式发布签核、Cloudflare 实际部署验证或生产数据合规证明。

## 一、已完成（代码与内容实现）

### 1. 品牌架构与首页体验

- 新增品牌平台定义：一句话定位“让每个空间，都拥有更适合人的光。”、Human / Space / Technology 三个价值支点，以及 JUHAO Lighting、Smart、Store 三条业务路径。
- 首页已改为八段品牌旅程：品牌定位、角色入口、五步方法、项目证据、五类空间、智能模式、品牌理由与咨询分流。
- 首页项目表述明确保留证据边界：当前 6 个项目档案均不被写成完工、供货或交付证明。
- 已引入渐进加载的首页动效、移动端导航/焦点处理和页面级可访问性基础结构。

主要文件：

- `content/brand-platform.ts`
- `features/home/HomePage.tsx`
- `features/home/HomePage.module.css`
- `app/page.tsx`

### 2. 项目、方案与产品内容结构

- 五类空间方案页已将空间信息、方案方向、产品入口和关联项目资料分开呈现；缺少项目资料时明确标注待补，不伪造案例。
- 建立案例扩展就绪台账。现有来源只能支持 28 个酒店、5 个公共、1 个商业项目，不能凭现有资料完成目标中的住宅/工业案例配比。
- 修正产品专题归类：6 款顶灯移至 `ceiling-lights`，3 款台灯/落地灯移至新的 `table-floor-lights`；旧路径保留永久重定向，专题和 canonical 同步更新。
- 新增工程参数覆盖卡；功率、色温、显色、配光、安装等字段尚未全量审核时，筛选保持禁用并展示真实覆盖数。
- 增加产品专题、产品详情、案例与空间方案之间的关联入口，所有推荐仍以资料核验状态为前提。

主要文件：

- `content/product-topic-overrides.ts`
- `content/product-filter-coverage.ts`
- `content/governance/case-expansion-readiness.json`
- `content/governance/product-engineering-filter-coverage.json`
- `content/scene-resources.ts`
- `features/catalog/CatalogPages.tsx`
- `features/business/BusinessScenePage.tsx`
- `lib/site-redirects.ts`

### 3. SEO 与内容治理

- 新增 SEO 编辑队列，列出七个目标主题，但全部为 `brief_only`、无正文、无公开路由、`noindex`；不会把尚未审核的泛内容伪装成已发布知识中心。
- 保留 137 条历史企业资料为私有档案，继续禁止先前移除的 33 条泛专业文章重新进入路由、搜索、sitemap、OG 或内链。
- 产品路由投影、构建预算、启动健康检查及构建产物验收已跟随新专题路径更新；当前审计路由数为 82。

主要文件：

- `content/seo-editorial-queue.ts`
- `content/governance/seo-editorial-queue.json`
- `scripts/check_bundle_budget.mjs`
- `scripts/check_launch_health.mjs`
- `tests/build-artifact-acceptance.test.mjs`

### 4. 咨询、线索与通知基础设施

- 联系页提供家庭、设计、工程、渠道四条结构化咨询路径，并向线索保存 `source`、`scene`、`intent` 和角色字段。
- D1 新增角色字段迁移 `0004_lush_roulette.sql`；线索过期索引已存在/补齐，过期清理从提交热路径移到定时维护流程。
- 通知改为先写入 D1、再异步处理；已实现原子 claim/lease、5 分钟定时维护、5m/30m/2h/12h 退避、第五次失败后的死信状态和无个人信息结构化日志。
- 联系接口默认 fail-closed：未满足环境门禁时，在读取正文前返回 503；开启后要求同源、HTTPS、Turnstile、限流、D1、Webhook 和密钥长度校验。
- 已增加咨询隐私审批、Webhook v2 验收、三类线索密钥互异等配置与发布检查项。

主要文件：

- `app/api/contact/route.ts`
- `app/api/contact/maintenance/route.ts`
- `db/consultation-leads.ts`
- `lib/server/consultation-maintenance.ts`
- `lib/server/lead-notifications.ts`
- `drizzle/0004_lush_roulette.sql`
- `worker/index.ts`
- `RECON/API_CONTRACT.md`

### 5. 第一方最小分析与隐私边界

- 新增最小事件字典、内容 ID 白名单、日聚合 D1 表与清理逻辑；默认不采集、不写入、不带联系人内容或可识别访客 ID。
- 分析启用需要客户端开关、服务端写入、D1 迁移、客户端生产构建验证、边缘限流和隐私签核同时通过。
- 新增 `ANALYTICS_CLIENT_BUILD_VERIFIED`，避免把 `NEXT_PUBLIC_*` 的构建期固化值与 Worker 运行时配置混为一谈。
- 新增根级错误边界，错误页不会回显表单内容、异常消息或堆栈。

主要文件：

- `app/api/analytics/`
- `components/analytics/`
- `lib/analytics/`
- `lib/server/analytics.ts`
- `db/analytics.ts`
- `drizzle/0005_luxuriant_hairball.sql`
- `RECON/ANALYTICS_CONTRACT.md`
- `app/error.tsx`

### 6. 已运行的验证（2026-07-22）

- 定向 Node 测试：案例就绪台账、SEO 队列、产品专题修正、工程筛选、通知 lease、分析、D1 迁移和线索路由，共 20/20 通过。
- 构建产物验收：8/8 通过。
- 最后一次完整本地回归：`npm test` 226/226 通过（包含生产构建）。
- `npm run typecheck`、`npm run lint` 均通过。
- `npm run check:a11y` 通过：21 个模板路由无严重 Axe、控制台或渲染问题，移动端抽样通过。
- `npm run check:release` 按设计失败：26 个人工签核待完成，公开索引、规范域、咨询依赖和全量目录发布均未获准。

这些结果证明当前本地代码回归通过，不等同于 Cloudflare、D1、Webhook、Access、正式域名或数据合规已在生产环境验收。

### 7. 已修复并验证的本地 UI、可访问性与数据最小化问题

1. 咨询入口关闭时，服务端传入只读状态；页面在需求核对前明确提示，并且不渲染联系人字段或提交按钮。`handleSubmit` 与键盘提交路径均再次检查该状态，避免请求落到 503。
2. 切换咨询方向会清除不适用的隐藏字段；提交 payload 只包含当前方向允许的 `projectType`、`area`、`location`、`organization`、`currentBusiness` 字段。
3. 首页 JUHAO Store 文案已改为“交易、订单与渠道业务待连接恢复并验收后承接”。
4. 首页案例卡和产品工程覆盖卡的文字对比度/字号已调整；浏览器 Axe 回归无严重问题。
5. 产品页辅助技术标签已从“已发布产品样本”修正为“私有预览产品样本”。
6. 方案页已拆分“空间特点”“照明目标”“解决方案”和“关联项目资料”四个独立语义区块。

## 二、未完成 / 明确阻断项

### A. 正式公开发布仍被阻断

以下环境与人工门禁均应继续保持关闭，不能通过改环境变量绕过：

- `PUBLIC_INDEXING_ENABLED=false`
- `CANONICAL_HOST_APPROVED=false`
- `PUBLIC_INTAKE_READY=false`
- `CONTACT_EDGE_RATE_LIMIT_VERIFIED=false`
- `CONTACT_D1_MIGRATION_VERIFIED=false`
- `CONTACT_PRIVACY_APPROVED=false`
- `CONTACT_WEBHOOK_V2_VERIFIED=false`
- `ANALYTICS_CLIENT_BUILD_VERIFIED=false`
- `ANALYTICS_EDGE_RATE_LIMIT_VERIFIED=false`
- `ANALYTICS_PRIVACY_APPROVED=false`

当前 `npm run check:release` 按设计应失败：公开索引、规范域、人工签核、咨询和分析均未获准。不得将其解释为代码故障后强行放行。

### B. 合规与个人信息处理未完成

- 尚未得到正式隐私政策、处理目的、保存周期、删除/导出流程和负责人签核。
- 联系人姓名、联系方式和需求目前仍会以业务字段写入 D1；字段级加密/令牌化、最小权限读取、读取审计和可执行的导出/删除流程尚未实现。
- Webhook 接收端的 v2 载荷、签名、告警和密钥隔离尚未在真实接收端完成演练。
- 所以公开咨询入口必须继续关闭。

### C. Cloudflare、访问控制和生产演练未完成

- 需要通过 Cloudflare Access 或等价授权机制保护 preview 与 `catalog-lab`；`noindex`、robots 和 hostname 判断不能替代访问控制。
- 真实 Worker/D1/Queue/Cron 冒烟、Webhook 超时/429、死信告警与回滚演练尚未完成。
- 本地未跟踪的 `wrangler.production.jsonc` 不应作为正式直发部署依据；它尚未被证明包含正确的 D1、Cron、Access 与全部门禁配置。
- DNS、apex/www/旧路径映射、证书、HSTS 灰度、Search Console 和可验证回滚方案尚未完成。

### D. 内容、媒体与增长资产未完成

- 当前只有 6 个阶段透明项目档案。目标的 10 个案例及住宅/商业/公共/工业配比，缺少原始事实、媒体授权和逐项目签核。
- 智能设备已审核数量为 0；下载中心已批准资料数量为 0。
- 未取得可公开使用的真实人物/生活/项目摄影，不能声称已完成 30/30/40 的品牌摄影结构。
- 不能声称“30 年”“已完工项目”“正式案例成果”、产能、网点、认证、服务区域等未经证实的品牌事实。

## 三、恢复工作后的建议顺序

1. 运行完整回归：

```bash
cd /Users/mac/Documents/Codex/2026-07-12/sites-plugin-sites-openai-bundled-3
git diff --check
npm run typecheck
npm run lint
npm test
npm run check:catalog-v2
npm run check:dist
npm run check:a11y
npm run check:visual-routes
npm run check:release
```

2. 将 `check:release` 的失败逐项分类：代码问题先修复；人工签核、域名、Access、D1/Worker/法务问题保持为外部阻断，不伪造成功。
3. 在真实 Cloudflare preview 完成 D1、Cron、Webhook、Access、CSP、Turnstile、移动端和错误态冒烟后，记录可复现证据。
4. 仅在所有外部签核完成、用户再次明确授权后，再提交、推送、部署或开放索引/正式咨询入口。

## 四、Git 与临时文件边界

- 当前工作树包含大量已修改跟踪文件，以及新增代码、迁移、治理台账和测试。
- `.playwright-cli/`、`output/`、`reports/`、`scripts/__pycache__/`、`wrangler.production.jsonc` 当前为未跟踪内容；提交前需逐一审核，默认不要把临时浏览器输出、报告缓存或本地生产配置纳入 Git。
- 旧交接文件 `JUHAO_WEBSITE_HANDOFF.md` 是 2026-07-14 的历史基线；其部署版本、测试数量、路由统计不再可用作本轮现状证明。

## 五、关键事实边界（不可改写）

- 当前站点仍应保持私有、`noindex`、空 sitemap 和关闭的公开咨询入口。
- “机器校验通过”不等于产品、案例、媒体或法律内容已获人工公开签核。
- 本地测试和 SQLite 测试不能替代 Cloudflare 真实 D1、Cron、Access、Webhook 和正式域名验证。
- 本轮没有执行 Git 提交、GitHub 推送、Cloudflare 部署或正式域名发布。
