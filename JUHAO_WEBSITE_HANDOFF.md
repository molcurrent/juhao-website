# JUHAO 钜豪照明官网交接摘要

- 最后核验：2026-07-14（Asia/Shanghai）
- 项目目录：`/Users/mac/Documents/Codex/2026-07-12/sites-plugin-sites-openai-bundled-3`
- 当前分支：`main`
- 当前状态：第一阶段治理和首批私有内容完成
- 本轮部署提交：`8a16d548044d47d6f5472fffdc255451567ebd6a`
- 本轮 Sites 版本：`19`
- 本轮私有预览地址：`https://juhao-lighting-2026.rocky-snail-3254.chatgpt.site`
- 最终自动化测试数量：`83/83 通过`
- 最终 Sites 归档：`28,078,080 bytes / 723 files（Sites 回执，约 26.78 MiB）`

> 本文档是本轮项目事实的优先入口。旧 `README.md`、`NOTES.md`、旧实施报告和部分 `RECON/**` 记录只代表历史阶段；数量、发布状态、索引资格和部署状态以当前代码、治理台账、最终测试与本文档为准。

## 1. 当前结论

网站已从“企业官网骨架”推进到可审计的首批私有内容：页脚 22 个目标页面具备明确内容状态、内链、参数化 CTA 和 SEO 状态；33 篇审核知识、31 个私有产品详情、6 个阶段透明项目、首批 8 篇企业/项目资讯、媒体本地化和咨询后端进入同一治理链。

当前仍不是正式公开站：

- 200 条发布台账记录。
- 119 个私有发布路由。
- 101 条站内可搜索内容。
- 107 个 SEO 候选。
- 33 个严格 `index_eligible` 页面。
- 0 个当前可索引页面。
- `sitemap.xml` 返回 200，但保持 0 个 `<loc>`。

没有公开访问、没有绑定正式域名、没有向 Google、Bing、百度或 IndexNow 提交 URL。

## 2. 冻结数量

### 2.1 内容与产品

| 指标 | 数量 |
| --- | ---: |
| 发布台账 | 200 |
| 私有发布路由 | 119 |
| 站内搜索 | 101 |
| SEO 候选 | 107 |
| 严格 `index_eligible` | 33 |
| 当前可索引 | 0 |
| 资讯 | 41 |
| 已审核知识文章 | 33 |
| 企业/项目资讯 | 8 |
| 资讯列表分页 | 7 |
| 帮助文章清单 | 137 |
| 项目来源 | 34 |
| 荣誉来源 | 10 |
| 产品候选 | 112 |
| 私有产品详情 | 31 |
| 智能设备候选 | 18 |
| JH31L331 候选 | 5 |

### 2.2 媒体

| 指标 | 数量 |
| --- | ---: |
| 原始 URL | 341 |
| 规范化 HTTPS 对象 | 332 |
| 去重源文件 | 264 |
| 本地派生文件 | 1,086 |
| 源码治理镜像 | 1,350 个文件 / 105 MB |
| 部署构建运行时媒体 | 524 个派生文件 / 18.66 MiB |
| 页面允许素材 | 178 |
| 禁发资讯候选 | 125 |
| 禁发案例补充候选 | 38 |
| 可审计引用 | 445 |
| 路由 OG 图 | 119 |
| 带 `batch_id` 且权利已批准 | 70 |
| 待页面级媒体状态核对 | 121 |

## 3. 发布与索引口径

`PublicationRecord` 通过以下字段控制发布：

- `index_eligible`
- `source_sha256`
- `previewed_at`
- `og_image`
- `media_authorization_batch_id`

运行时索引状态：

```text
currentlyIndexable = PUBLIC_INDEXING_ENABLED && index_eligible && published
```

必须区分：

- `seo_candidate=107`：值得继续做 SEO 审核。
- `index_eligible=33`：已经满足当前严格来源、审核和权利条件。
- `currentlyIndexable=0`：私有模式公共索引开关关闭。

环境门禁保持：

```text
PUBLIC_INDEXING_ENABLED=false
CANONICAL_HOST_APPROVED=false
PUBLIC_INTAKE_READY=false
```

`SITE_CANONICAL_ORIGIN=https://juhao.com` 只是兼容值，不代表正式域名已确认。正式域名未批准时真实公开门禁必须失败。

核心文件：

- `content/publication-ledger.ts`
- `content/governance/content-ledger.csv`
- `content/governance/content-ledger.json`
- `content/search-index.ts`
- `app/sitemap.ts`
- `scripts/validate_content_ledger.mjs`
- `scripts/check_public_seo_simulation.mjs`

## 4. 企业知识库

### 4.1 专业知识

- 33 篇已审核专业文档已生成提交态 JSON，并记录源文件 SHA-256。
- 导入器兼容 YAML 数组和逗号分隔标量。
- `content-freeze-2026-07-14` 已冻结 33 篇知识、137 条帮助、112 个产品候选、10 个产品专题、商城 SQL 和 332 个媒体对象。
- 冻结含 293 项外部本地核验；生成器已连续运行两次且结果一致，`python3 scripts/source_freeze.py --check` 通过。
- 同一 URL 的媒体下载受字节 SHA-256 门禁约束，字节变化必须重新冻结。
- 运行时不读取本机绝对知识库路径，客户端不包含完整治理台账。
- 实际知识库中 33 篇专业文档全部记录外部 URL。旧方案中“部分文章无外链”的假设不成立，因此没有人为删除已存在来源。
- 无外链披露逻辑仍保留：确实缺少外链时显示“内部知识库审核，外部来源链接未记录”，结构化数据不伪造引用。
- `reviewed_at` 只显示为“JUHAO 审核日期”；全部 `published_at` 在正式公开前为空。

### 4.2 帮助与来源清单

137 条帮助记录分为：34 项目、10 荣誉、21 品牌/企业动态、6 智能能力、3 产品专题、7 智能教程缺文件、6 IES 缺文件、5 视频缺文件、45 旧商城或错误模板。

- 现有项目页面关联 ID：`199,220,226,228,229,231,217,218,219,221`。
- 其余 24 个项目来源只作候选，不新增项目路由。
- 荣誉来源：`126,151,152,167,171,184,185,222,223,225`。
- 荣誉证书、授予方、日期和主体不齐时，不输出“5 项/10 项荣誉”等数字。
- 事实纠正：`#228=苏州金融街君悦酒店`、`#229=南通海门希尔顿逸林酒店`、`#220=扬州经开区一河两岸户外亮化工程`。

### 4.3 禁止集

- 硬排除 SQL ID：`25,26,110,115,116,162,163,198,202,211,212,213,214,215`。
- 旧商城禁止集：`1–12,14,15,17,18,27–33,105–109,111–114,130–140,143,148`。
- 非照明商品：`4014,4019,4020,4021,5181,11702,11703`。
- 禁止读取或输出 `jh_sys_configs`。
- 构建扫描 `undefined-*`、旧联系方式、价格、库存、支付、物流、合作政策、OSS 域名和本机绝对路径。

核心文件：

- `content/governance/knowledge-articles.generated.json`
- `content/governance/help-article-inventory.csv`
- `content/governance/help-article-inventory.json`
- `content/governance/hard-exclusions.json`
- `content/governance/source-freeze.json`

## 5. 产品、专题与案例

### 5.1 产品

- 产品候选 112 款；31 款继续作为私有产品详情，81 款保持候选。
- 射灯专题使用 `12282–12287` 六款代表产品。
- 家居顶灯专题使用 `12377–12381,12217` 六款代表产品。
- 18 款智能设备因协议、兼容、部署与售后资料不足，详情页数量为 0。
- JH31L331 的 `6692,10505,10506,10507,10508` 因型号映射和 `undefined-*` 参数未解决而保持候选。
- 候选产品不进入产品运行时数据、站内搜索或 sitemap。
- 产品详情中的来源媒体已使用 `<figure>` 与 `<figcaption>` 输出可见来源图注。

核心文件：

- `content/governance/product-candidates.json`
- `content/governance/published-products.json`
- `scripts/build_product_catalog.py`

### 5.2 案例

深圳华发冰雪世界 JW 万豪酒店和上饶广丰铂尔曼酒店已形成旗舰证据页。页面按背景、当前阶段、服务范围、空间拆解、照明难点、产品品类和资料缺口组织。

所有案例遵守：

- 图片不作为完工证明。
- 中标、签约或资料来源不升级为供货、施工或完工。
- 已确认事实与暂缺资料分开呈现。
- 项目 OG 显示真实阶段标签。

## 6. 页脚页面与资讯

页脚 22 个目标保持现有路由：

- 品牌：`/about`、`/products`、`/cases`、`/about/history`、`/about/join`、`/healthy-light`、`/sustainability`。
- 方案：`/solutions`、`/solutions/residential`、`/solutions/hospitality`、`/solutions/commercial`、`/solutions/public`、`/solutions/industrial`。
- 服务：`/smart-home`、`/service`、`/partners`、`/downloads`。
- 内容与合规：`/news`、`/search`、`/contact`、`/legal`、`/privacy`。

页面末尾使用参数化咨询入口；正式电话、邮箱、企业微信和地址未核验前不展示。招聘、可持续、合作、下载、法律与隐私保留资料状态，不编造职位、ESG、工厂数据、政策、文件或法务结论。

22 个页脚目标的页面末尾 CTA 已加入回归测试，覆盖来源参数和业务入口。

资讯共 41 篇：

- 已审核知识文章 33 篇。
- 企业/项目资讯 8 篇。
- 列表分页 7 个。

文章只进入现有 `/news/[slug]` 与 `/news/page/[n]` 体系。`reviewed_at` 不作为 `datePublished`；正式公开前 `published_at` 保持空值。

## 7. 媒体与品牌 VI

### 7.1 授权与镜像

- 授权批次：`oss-batch-2026-07-14-current-site-341`。
- 341 URL 排序哈希：`e8418df1c570b6b719c9d916edcfc36f47282c4146b13ba9f7a4818dbf705e7d`。
- 332 HTTPS 对象哈希：`da18ce0b67bf50c7d8e549a3995592fe05311af1531e57567547677f450802eb`。
- 332 个对象去重为 264 个源，生成 1,086 个派生文件；本地文件合计 1,350。
- 178 个素材允许进入页面；125 个资讯候选与 38 个案例补充候选继续 `publish_allowed=false`。
- 授权记录与台账已统一：70 条带 `batch_id` 的记录，其 `image_rights_status` 全部为 `approved`。
- 仍有 121 条页面级媒体状态待逐页核对；批次授权不替代内容事实审核。
- 页面媒体只使用 `media_id` 与本地派生路径；缺少本地文件时构建失败，不回退远程 URL。
- 源码治理镜像保留 1,350 个文件、约 105 MB；部署构建只保留 `runtime-media` 引用的 524 个派生文件，共 18.66 MiB，全部 source 与未引用派生被剔除，禁发素材不会进入 Sites 归档。
- 119 个实际发布路由均有 1200×630、低于 300KB 的 JPEG OG/Twitter 图。

核心文件：

- `content/governance/media-authorization-batches.json`
- `content/governance/media-source-snapshot.json`
- `content/governance/media-mirrors.json`
- `content/governance/runtime-media.json`
- `content/governance/content-media-assignments.json`
- `content/governance/route-og.json`

### 7.2 VI

- VI PDF SHA-256：`a8801f9f5ee201db38319f5454d7e7e78a83a712f93de105781e20375d992ec2`。
- PDF 本体不进入站点或 Git 历史。
- 页面依据第 5–9 页规范以及四个 Logo、favicon 输出。
- 屏幕适配橙 `#e05717` 的来源为 `PANTONE 1505 CVC / CMYK 0/80/100/0`。
- Logo 不拉伸、不重绘、不擅自改色。

## 8. 咨询闭环

联系线索具备：

- `source`、`sourceDetail`、`scene`、`intent`。
- D1 写入、线索编号与幂等请求。
- 成功页重新读取 D1，伪造编号不显示成功。
- 通知状态 `pending/sent/retry/dead_letter/not_configured`。
- Webhook 配置后强制 HMAC 与 `Idempotency-Key`。
- 鉴权维护任务支持重试、死信处理与 180 天清理，即使没有新线索也可执行清理。

正式公开咨询仍需同时满足：D1 迁移确认、通知接收人、Webhook/HMAC、法务确认的隐私版本、Turnstile 客户端、防滥用、生产维护调度和端到端测试。当前只有维护任务能力，不代表生产调度已经配置。

核心文件：

- `app/api/contact/route.ts`
- `app/contact/success/page.tsx`
- `db/consultation-leads.ts`
- `migrations/0001_consultation_notification_delivery.sql`

## 9. SEO 与性能

已完成：

- 119 个私有路由具备单一 H1、唯一 title/description/canonical、路由 OG 和 Breadcrumb。
- 私有模式全站 `noindex`；sitemap 返回 200、0 个 `<loc>`。
- 公开模拟按 33 个严格 `index_eligible` 页面精确校验；正式域名未确认使真实发布门禁继续失败。
- Article、Organization、Product 等结构化数据与可见内容一致，不伪造 Offer、Review、Rating、地址或联系方式。
- 数字旧链接按内容状态返回精确 308、404 或 410。
- 资讯与下载使用精简服务端数据；客户端不加载完整治理台账。
- 强制等待加载页和全局 GSAP 已移除。

性能预算：

| 指标 | 实际值 | 结果 |
| --- | ---: | --- |
| 路由预算 | 119/119 | 通过 |
| 首页首屏 JS/CSS gzip | 151,984 B | 通过 |
| 联系页首屏 JS/CSS gzip | 147,383 B | 通过 |
| 单路由原始主包最大 | 189,805 B | 通过 |

## 10. 验收证据

- 119/119 私有发布路由通过路由与 SEO 验收。
- 私有 sitemap 为 200 且 0 个 `<loc>`。
- 公开模拟 33/33 严格资格页面精确一致。
- 性能预算 119/119 通过。
- 构建产物企业 OSS 域名出现次数为 0。
- 禁止 ID、非照明商品、`jh_sys_configs`、遗留联系方式、价格、库存、`undefined-*` 与本机绝对路径泄漏为 0。
- 视觉与可用性 13/13 通过，覆盖 390、1012、1440、键盘、减少动态、横向溢出与关键截图。
- `content-freeze-2026-07-14` 冻结检查通过，293 项外部本地核验完成；生成器二次运行一致。
- 同 URL 媒体字节哈希门禁通过。
- 部署构建媒体已收敛为 524 个派生文件 / 18.66 MiB；不包含 source 或未引用派生。

最终自动化测试与 Sites 归档回执均已完成：

- 最终自动化测试数量：`83/83 通过`
- 最终 Sites 归档：`28,078,080 bytes / 723 files（Sites 回执，约 26.78 MiB）`

18.66 MiB 是部署构建中的运行时媒体大小，不是最终 Sites 归档大小。当前实验室包预算不等于正式域名下的真实 Core Web Vitals 已验收。

公开前与每次私有部署前运行：

```bash
cd /Users/mac/Documents/Codex/2026-07-12/sites-plugin-sites-openai-bundled-3
python3 scripts/source_freeze.py --check
npm test
npm exec tsc -- --noEmit
npm run lint
npm run check:dist
node scripts/validate_content_ledger.mjs
PUBLIC_INDEXING_ENABLED=true CANONICAL_HOST_APPROVED=false npm run check:seo-public
git diff --check
```

公开模拟后必须重新执行私有 `npm run build`，确认部署包仍为全站 `noindex` 和空 sitemap。

## 11. Sites 私有部署

本轮所有者私有部署已完成，以下信息是当前证明：

- 项目 ID：`appgprj_6a533dc64d64819194e7761cf915e12d`
- 提交号：`8a16d548044d47d6f5472fffdc255451567ebd6a`
- Sites 版本：`19`
- 私有预览地址：`https://juhao-lighting-2026.rocky-snail-3254.chatgpt.site`
- 部署状态：`succeeded`；119/119 路由远程返回 200，noindex 119/119，sitemap 0 个 `<loc>`，未鉴权返回 401
- 最终自动化测试数量：`83/83 通过`
- 最终 Sites 归档：`28,078,080 bytes / 723 files（Sites 回执，约 26.78 MiB）`

部署只能保持所有者私有访问。不得切换公开访问、不得绑定正式域名、不得提交搜索引擎。

## 12. 外部人工门禁

以下事项不能由代码或本地知识库代替：

1. 企业主体、电话、邮箱、企业微信、地址和负责人签核。
2. 企业年份、产能、门店、服务区域和荣誉证据签核。
3. 产品协议、兼容、部署、售后、在售状态和图片授权审核。
4. 项目阶段、服务范围、完工证据和项目图片授权审核。
5. 法律声明、隐私政策、保存期限、删除流程和版本签核。
6. 通知接收人、Webhook/HMAC、Turnstile 客户端、防滥用、生产维护调度、重试与告警配置。
7. 商城、旧登录入口、正式域名、Analytics 和搜索平台账号确认。
8. 用户对公开访问、域名绑定与搜索引擎提交的单独批准。
9. 正式公开前的完整端到端测试，以及正式公开后的真实 Core Web Vitals 采集。

外部门禁未通过前，保持所有者私有访问、全站 `noindex` 和空 sitemap。

## 13. 下一位执行者的安全顺序

1. 以版本 19 和部署提交 `8a16d54` 作为本轮私有基线，不覆盖其来源快照。
2. 后续变更先重跑本交接第 10 节的全部验证命令，再建立新提交和新 Sites 版本。
3. 只按企业签核结果逐条放行，不批量推定同类内容通过。
4. 公开前重新取得用户明确批准。
