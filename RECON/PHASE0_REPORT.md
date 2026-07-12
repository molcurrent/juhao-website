# 阶段 0：实时取证与可复刻性审计报告

## 1. 结论

阶段 0 的取证基线已建立，可以进入阶段 1 的工程底座建设。当前结论为 **L5 复杂度**：原站不是单页展示页，而是服务端输出 HTML、由页面级脚本增强的多页面 CMS；首页同时存在 Three.js / ShaderPass、Canvas 帧序列、JSMpeg、Swiper、TweenMax、滚轮与 Ajax 状态。页面结构可以按证据重建，但复杂动效必须遵循“先 baseline、后工程化”，不能仅凭静态截图猜实现。

本报告只证明 2026-07-12 本轮公开访客侧取证所见。原站品牌、正文、联系人及素材不进入 JUHAO 正式发布包；正式版本只使用钜豪自有或已获授权的内容与素材。

## 2. 取证范围与时间

- 目标站点：`https://www.nvc-lighting.com.cn/`
- 主要浏览器取证窗口：**2026-07-12 15:49:57–16:02:35（Asia/Shanghai）**。该范围由网络捕获、三档侦察、路由抓取、短等待探针和 settled 探针各自 JSON 的 `capturedAt` 换算得到。
- 补充接口结构验证、sitemap 与 source map 校验：2026-07-12。
- 覆盖内容：三档首页运行时、同主域内链 crawl、sitemap 漂移、首页网络、公开业务查询接口的只读结构探针、加载前后交互、可下载素材、source map 可用性、动效清单及路由契约。
- 不在本轮范围：后台/CMS、数据库、需要登录的功能、第三方商城与采购子站、JUHAO 新工程的性能与可访问性验收。

核心证据：

- [三档运行时侦察](original/original-recon.json)与[摘要](original/original-summary.md)
- [25 条浏览器路由地图](original/routes/original-route-map.json)与[可读表格](original/routes/original-route-map.md)
- [Sitemap 漂移审计](SITEMAP_DRIFT.md)与[目标路由契约](ROUTE_CONTRACT.md)
- [首页网络捕获](original/network/original-network.json)与[接口结构证据](API_EVIDENCE.md)
- [短等待交互探针](original/interactions/original-interactions.json)、[settled 交互探针](original/interactions/settled/original-settled-interactions.json)与[探针限制说明](original/interactions/PROBE_NOTES.md)
- [素材清单](original/asset-manifest.json)、[Source map 校验](original/sourcemaps/VALIDATION.md)、[动效清单](MOTION_INVENTORY.md)与[设计 DNA](design-dna.json)

## 3. 证据等级口径

| 等级 | 定义 | 本项目使用规则 |
|---|---|---|
| `SOURCE` | 来自本轮实时 DOM、运行时状态、请求/响应结构、公开 bundle 或浏览器截图的直接证据 | 可以进入路由、组件状态和适配器契约；公开内容仍必须换成 JUHAO 自有版本 |
| `PARTIAL` | 有直接证据，但覆盖不完整，例如只验证了单个样本、单一视口或缺少完整交互前置序列 | 可以作为实现方向，必须保留降级并在对应页面专项验收中补证 |
| `GUESS` | 由命名、视觉相似性或常见做法推断，缺少本轮直接证据 | 不作为生产实现或阶段验收依据；若采用，必须先补取证 |

以下所有“已确认”均按 `SOURCE` 口径；明确标为 `PARTIAL` 或列入 **NOT PROVEN** 的内容不应被提升为事实。

## 4. 路由与 Sitemap 漂移

### 4.1 浏览器 crawl

- Crawl 在同主域、最大深度 3、最大页面数 100 的约束下捕获 **25 条 HTML 页面**，25 条均返回 `200`。
- 覆盖首页、About / History / Join、5 个业务页、健康照明、ESG、服务、招商、搜索、下载、法律、隐私、新闻列表/详情/分页等访客侧页面族。
- PDF、EXE、ZIP 被浏览器识别为下载，不计入 25 条 HTML；`/news/page/4` 因深度限制未进入本次 crawl。

### 4.2 Sitemap

- 实时 sitemap 包含 **64 个唯一 loc**，但不能单独作为路由真相。
- 已确认漂移：sitemap 新增 `/about/duty` 及多条新闻详情；同时存在错误拼接的加入页面 URL。
- 已确认遗漏：`/news`、`/esg`、`/search`、`/download`、`/law`、`/privacy` 等当前可访问页面并未被完整列出。
- 页脚暴露的 `/about/talent` 当前返回 `404`；`/about/duty` 虽返回 `200`，但内容错误地落到首页，均不应原样复制为 JUHAO 正式页面行为。

因此，阶段 1 采用 [ROUTE_CONTRACT.md](ROUTE_CONTRACT.md) 冻结的页面族作为目标路由基线；sitemap 只作为发现源之一，不能覆盖浏览器可见导航、表单 action 和运行时跳转事实。

## 5. 三档首页运行时

| 视口 | 页面高度 | 正文字符 | 链接 | 图片 | 视频 | Canvas | 脚本 | 截图 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1440 × 900 | 6119 | 1434 | 95 | 67 | 8 | 3 | 21 | [1440](original/screenshots/original-1440.png) |
| 768 × 900 | 6014 | 693 | 95 | 66 | 3 | 3 | 21 | [768](original/screenshots/original-768.png) |
| 390 × 900 | 5414 | 882 | 95 | 66 | 3 | 3 | 21 | [390](original/screenshots/original-390.png) |

三档均检测到 Three.js 信号，未检测到 React、Next、Vue、Nuxt、Svelte 或 Astro；页面符合“服务端 HTML + 前端增强”的判断。全局侦察记录 **0 条 console error、0 条 page error、10 条 warning**：其中 6 条与 CNZZ 通过 `document.write` 注入跨站阻塞脚本有关，4 条为 1440 档 WebGL `ReadPixels` 引发的 GPU stall 性能警告。

这些数量是当次首页 DOM 的运行时快照，不等于整站总量，也不证明所有媒体均完成播放或加载。

## 6. 网络与只读接口结构

### 6.1 首页网络会话

[首页网络捕获](original/network/original-network.json)记录 **257 次请求/响应事件**：

- 方法：256 次 `GET`、1 次 `POST`。
- 主机：254 次指向 `www.nvc-lighting.com.cn`；其余 3 次分别指向 `s9.cnzz.com`、`c.cnzz.com`、`z12.cnzz.com`。
- 唯一的网络会话 `POST` 是发往 `z12.cnzz.com/stat.htm` 的统计 ping，不是业务查询。
- CNZZ 同时通过 `s9.cnzz.com` 与 `c.cnzz.com` 加载脚本；其 `document.write` 用法已产生浏览器警告。JUHAO 新工程不得照搬该统计接入方式。

257 是一次首页会话的请求数，不是全站所有路由的网络总量。

### 6.2 四个业务查询接口

以下结构来自访客页面已有行为与另行执行的安全、只读 POST 样本。这里只冻结参数和响应 schema，不记录或迁移联系人、电话、门店等原站值。

| 用途 | 请求契约 | 响应 schema | 样本边界 | 目标适配器 |
|---|---|---|---|---|
| 产品弹窗 | `POST /brand`，`get_products_home=1`，`products_id: id` | `{ ktitle, ktitle_en, kvideo, listimg, related_products[] }`；关联项为 `{ kimg, ktitle, products_id }` | 单一产品样本；关联项样本数 3 | `ProductDetail` + `ProductSummary[]` |
| 省份到城市 | `POST /service`，`get_city=1`，`province: string` | `string[]` | 单一省份样本；数组长度 21 | `RegionProvince.cities` |
| 城市到门店 | `POST /service`，`get_shop=1`，`city: string` | `Array<{ ktitle, address }>` | 单一城市样本；数组长度 14 | `ServiceLocation[]` |
| 区域到招商联系人 | `POST /investment`，`get_agent=1`，`province: regionKey` | `Array<{ name, province, tel }>` | 单一区域样本；数组长度 1 | `RegionalPartnerContact[]` |

阶段 1 只实现类型化 Mock/API adapter。新页面不得调用原站端点，也不得延续原 bundle 的 `eval` 响应解析方式。

## 7. 加载前后交互取证

两次探针都从首页发现 **60 个可见交互候选**与 **3 个可见 Canvas 目标**，各执行 25 个动作，且均为 0 条 console error。

| 探针 | 页面加载后等待 | 动作 | 状态变化 | 动作错误 | 结论 |
|---|---:|---:|---:|---:|---|
| 短等待 | 800 ms | 25 | 10 | 15 | 全屏 `#load .frame__load` 仍会拦截大量 hover/click，证明加载态具有指针阻塞语义 |
| Settled | 5000 ms | 25 | 9 | 12 | 验证中部/底部滚动、顶级导航 hover、进入 `/about`、进入 `/brand/whole_house` 及 2 个可见 Canvas drag 状态；共生成 14 张 settled 截图 |

探针限制必须保留：通用脚本会为每个动作重新加载页面，因此对子菜单项的测试没有先执行“hover 父项 → 子菜单显现”的必要前置序列。12 个 settled 动作错误不能证明子菜单损坏；它们只说明通用探针无法验证该序列。Canvas 的“changed”也只证明拖动前后捕获状态不同，不证明完整 shader 参数、动画速度或业务语义。

因此本轮把“阻塞式 loader”与“加载完成后的可用导航/Canvas 状态”列为 `SOURCE`；子菜单完整链路、轮播、触摸和键盘等仍为 `PARTIAL`，须在页面专项交互矩阵中补验。

## 8. 素材与 Source map

### 8.1 素材

[素材清单](original/asset-manifest.json)依据首页侦察中的可发现资源下载 **52/52 成功、0 失败**，其中 19 个脚本、33 个图片资源。该清单用于结构、尺寸、依赖和动效证据，不是原站全库清单，也不构成版权授权。原始二进制只保留在本地 RECON，不进入 JUHAO 发布包。

### 8.2 Source map

对 19 个脚本执行公开 source map 检查后，**有效 source map = 0**。

自动清单中两个 `ok` 是查询字符串拼接造成的假阳性：请求返回的是原 JavaScript，不具备 source map 所需的 `version`、`sources`、`mappings`。正确构造的 `app.min.js.map` 与 `zhcool.min.js.map` 候选均返回 `404`，两份线上脚本也没有 `sourceMappingURL`。因此只能把生产 bundle、运行时 DOM/网络和截图作为源码级证据，不能声称已获得原始工程源码。

## 9. L5 判定与复刻策略

复杂度判定为 **L5**，依据如下：

1. 多页面 CMS 与服务端 HTML 路由并存，不是单一 SPA 页面。
2. 全站 PC/移动双导航、加载序列、滚动入场、数字动画、返回顶部等状态跨页面共享。
3. 首页及业务页同时存在 Three.js、EffectComposer/ShaderPass、Canvas 帧序列、视频/JSMpeg、Swiper、TweenMax 和滚轮交互。
4. 产品、服务、招商通过页面路径复用的 POST 接口动态取数，包含联动选择、弹窗、FAQ 和区域状态。
5. 无有效公开 source map，复杂效果需要从压缩 bundle 与运行时行为交叉还原。

实施边界：布局比例、信息层级、交互状态和运动节奏按证据重建；品牌、URL、正文和素材切换为 JUHAO 自有版本。WebGL/Canvas 先建立可对照的 baseline 和静态降级，再进入细节校准；任何 `GUESS` 不得伪装成像素级复刻完成。

## 10. 阶段 0 验收清单

- [x] 三档 1440 / 768 / 390 首页截图和运行时 JSON 已落盘。
- [x] 同主域浏览器 crawl 已生成，25 条 HTML 页面状态可审计。
- [x] 64 个 sitemap loc 的漂移、错误拼接与已知遗漏已记录。
- [x] 首页网络 257 次请求已归档，并区分 CNZZ 统计 POST 与业务查询。
- [x] 四个公开查询型 POST 的参数与响应 schema 已以只读方式验证；报告未写入联系人或隐私值。
- [x] 800 ms 与 5000 ms 两个加载阶段的交互探针均已保留，限制条件已单列。
- [x] 首页可发现素材 52/52 下载结果已形成 manifest；上线版权边界已声明。
- [x] 19 个脚本的 source map 候选已复核，有效结果为 0。
- [x] 路由契约、动效清单、设计 DNA、接口映射和当前工程缺口均已有独立证据文件。
- [x] `SOURCE / PARTIAL / GUESS` 口径已冻结。

阶段 0 验收结论：**PASS WITH KNOWN LIMITS**。本结论允许开始工程底座与首个页面域实现，不代表所有页面、动效或业务数据已完成复刻。

## 11. 进入阶段 1 的闸门

### 11.1 当前已满足，允许进入

1. **路由闸门：PASS** — 以 `ROUTE_CONTRACT.md` 为 canonical；不直接照抄存在漂移的 sitemap。
2. **证据闸门：PASS** — 所有实现项必须绑定 `SOURCE / PARTIAL / GUESS`；`GUESS` 不进入验收。
3. **数据闸门：PASS** — 先使用类型化 JUHAO Mock，视图只依赖 adapter；禁止访问原站接口和使用 `eval`。
4. **内容与版权闸门：PASS（带持续条件）** — 正式页面只使用已核实的 JUHAO 文案及自有/授权素材；RECON 二进制仅作证据。
5. **复杂动效闸门：PASS（仅限底座）** — 可以搭建 motion 基础、静态 fallback 和首个 vertical slice；在逐帧参数补证前，不得把 WebGL/Canvas 标为高保真完成。

### 11.2 阶段 1 必须保持的停止条件

- 若页面所需 JUHAO 企业事实、法律文本、联系方式或素材授权未核实，使用明确的 Mock/占位状态，不得编造并发布。
- 若复杂效果只有 `GUESS`，先实现可访问的静态/轻量降级并补取证，不得用不相干动画冒充原效果。
- 若新增路由与 `ROUTE_CONTRACT.md` 冲突，先更新并审计契约，不能让 catch-all 模板静默吞掉页面族。

## 12. NOT PROVEN

以下事项本轮没有证明，后续不得引用为已确认事实：

1. 25 条 crawl 是整站全部页面。它只覆盖本轮同主域可发现内链；64 条 sitemap 中的大量新闻详情未逐页浏览，第三方/子域也不在范围内。
2. 64 条 sitemap 均有效、内容唯一或 canonical 正确。已存在错误拼接、遗漏和返回错误内容的反例。
3. 257 次请求代表整站网络成本。它只是单次首页会话；其他路由、交互后请求和缓存条件可能不同。
4. 52 个成功下载资源等于原站全部素材，或这些素材可被 JUHAO 公网使用。两项均未证明。
5. 四个业务接口的完整 schema、错误码、空数据、缓存、并发、鉴权、限流和长期可用性。当前只验证了各一个只读样本。
6. Settled 探针中的子菜单动作错误意味着菜单损坏。探针缺少父项 hover 前置序列，不能作此结论。
7. hover、touch、wheel、键盘、焦点管理、轮播自动推进、视频结束、后台标签页和 reduced-motion 的完整交互时序。
8. WebGL/Canvas 的全部 shader、uniform、坐标、速度、帧同步、GPU 成本和设备降级结果；当前仅有 bundle/运行时/截图与有限 drag 证据。
9. 有效公开 source map 为 0，等同于原开发团队不存在内部源码或私有 source map。只能证明本轮公开候选不可用。
10. 原站数据库/CMS 表结构。页面字段与接口参数只能支持目标数据模型设计，不能证明后端真实表结构。
11. JUHAO 的品牌历史、招聘、门店、服务政策、招商联系人、ESG 指标、下载文件、法律文本、电话与地址等正式业务事实。
12. 当前 JUHAO 工程已经满足全路由 SEO、视觉一致性、性能、键盘可用性、响应式或无障碍标准；这些属于后续实现与验收阶段。
