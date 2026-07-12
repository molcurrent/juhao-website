# NVC 页面族 → JUHAO 正式路由契约

本契约冻结访客侧页面族和目标工程边界。结构、节奏和交互状态以实时取证为基线；URL、品牌、正文和素材使用钜豪自己的版本。

| 原站页面族 | JUHAO canonical | 页面模板 / feature | 初始数据源 | 兼容策略 |
|---|---|---|---|---|
| `/` | `/` | `home` | 本地品牌内容 | 保留 |
| `/about` | `/about` | `brand/about` | 本地品牌内容 | 保留 |
| `/about/history` | `/about/history` | `brand/history` | 已核实品牌时间线 | 保留 |
| `/about/join` | `/about/join` | `brand/careers` | 已核实招聘内容 | 保留 |
| `/about/duty` | `/sustainability` | `esg/overview` | 已核实可持续内容 | 原路径仅 redirect；实时页面错误返回首页，不能照搬 |
| `/brand` | `/solutions` | `business/index` | Mock categories | redirect |
| `/brand/whole_house` | `/solutions/residential` | `business/scene` | Mock products/scenes | redirect |
| `/brand/hotel` | `/solutions/hospitality` | `business/scene` | Mock products/scenes | redirect |
| `/brand/business` | `/solutions/commercial` | `business/scene` | Mock products/scenes | redirect |
| `/brand/public` | `/solutions/public` | `business/scene` | Mock products/scenes | redirect |
| `/brand/special` | `/solutions/industrial` | `business/scene` | Mock products/scenes | redirect；目标品牌以工业/特种能力定义为准 |
| `/healthy` | `/healthy-light` | `healthy` | 自有健康光技术内容 | redirect |
| `/esg` | `/sustainability` | `esg` | 自有 ESG / 公益内容 | redirect |
| `/service` | `/service` | `service` | Mock FAQ/regions/locations | 保留 |
| `/investment` | `/partners` | `investment` | Mock regions/partner support | redirect |
| `/news` | `/news` | `news/list` | Mock articles | 保留 |
| `/news/page/:page` | `/news/page/:page` | `news/list` | Mock pagination | 保留，页码越界返回 404 |
| `/news/:numericId` | `/news/[slug]` | `news/detail` | 自有文章/报告 | 不复制原 ID/正文；旧数字详情统一转新闻列表 |
| `/search?keywords=` | `/search?keywords=` | `search` | 本地全文索引 adapter | 保留；结果页视策略 noindex/follow |
| `/download` | `/downloads` | `download` | Mock download metadata | redirect |
| `/law` | `/legal` | `legal` | 经审核法律文本 | redirect |
| `/privacy` | `/privacy` | `legal/privacy` | 经审核隐私文本 | 保留 |

## 原站外部域边界

- `product.nvc-lighting.com.cn` 产品中心、SRM、天猫、京东、拼多多及微信文章不是本次主站路由。
- JUHAO 版本只提供自有产品、商城和合作入口，不代理或复刻第三方站点。

## 当前路由发现结论

- 浏览器内链 crawl：25 条页面，全部 `200`。
- 实时 sitemap：64 个唯一 loc，但包含错误拼接 URL，且漏掉多个当前可访问功能页。
- 验收路由以本契约中的页面族为准；新闻详情按自有内容规模生成，不以复制原站 50 余篇新闻为目标。

## 实现约束

- 每个页面族必须有独立 feature 模块，不允许继续用同一个 catch-all 内容模板冒充不同业务页。
- 旧路径只做 redirect/alias，不成为 canonical。
- 页面组件只依赖统一 adapter；Mock 和真实 CMS 的切换不改变视图组件。
- 未核实的钜豪历史、招聘、门店、招商、ESG、下载、法律信息不得编入结构化数据或正式正文。
