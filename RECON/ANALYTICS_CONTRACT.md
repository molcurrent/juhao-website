# 第一方最小分析契约

## 当前状态

- 浏览器开关 `NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED` 默认 `false`；关闭时客户端不发分析请求。
- 写入开关 `PRIVACY_ANALYTICS_WRITE_ENABLED` 默认 `false`；关闭时 `/api/analytics` 返回空的 `204`，不写数据库。
- `NEXT_PUBLIC_` 开关在构建时固化；生产构建或真实预览未证明浏览器包已携带预期值并成功发送固定事件前，`ANALYTICS_CLIENT_BUILD_VERIFIED` 必须保持 `false`。
- 只有应用 `analytics_daily_counts` 迁移并核验真实 D1 绑定后，才可把 `ANALYTICS_D1_MIGRATION_VERIFIED` 设为 `true`。
- Cloudflare 边缘对 `/api/analytics` 的限流完成真实预览核验前，`ANALYTICS_EDGE_RATE_LIMIT_VERIFIED` 必须保持 `false`。
- 2026-07-22 版第一方分析披露获数据/隐私负责人签核前，`ANALYTICS_PRIVACY_APPROVED` 必须保持 `false`。
- 浏览器发送与服务端写入任一开启时，发布检查要求两者、客户端构建证明和三项治理门禁全部为 `true`；全关闭是允许的安全发布状态。
- 当前没有第三方分析或 CRM 账号，本实现也不创建或假定这些外部系统。

## 数据边界

服务端只接受固定事件名、固定枚举和治理白名单中的内容 ID，并按 UTC 日期聚合计数。案例事件只能引用当前 6 个案例来源 ID，产品事件只能引用当前 31 个产品来源 ID，下载事件只能引用已批准下载集合；当前批准下载集合为空。任意随机但格式合法的 ID 也会被拒绝，避免攻击者制造高基数聚合维度。白名单记录在 `content/governance/analytics-content-allowlist.json`，并由测试与当前内容集合核对。

分析不接收或保存 Cookie、用户/会话 ID、IP、User-Agent、完整 URL、查询参数、联系方式、咨询正文或其他自由文本。浏览器检测到 Global Privacy Control 或 Do Not Track 时不发送浏览事件。`consultation_submit_success` 与表单浏览使用同一隐私开关，用于计算同口径提交率；`consultation_lead_created` 不接受浏览器上报，只在 D1 首次成功创建线索后由服务端聚合，重复幂等请求不会重复计数。

聚合记录保存在现有 Cloudflare D1 的 `analytics_daily_counts` 表，保留 400 天后由既有定时维护任务分批清理。事件没有独立访客标识，因此只能用于趋势和页面漏斗，不能计算去重人数、跨设备归因或审计级收入归因。浏览器事件也可能被拦截或伪造，不应作为财务或 SLA 依据。

## 事件与 KPI

| KPI | 分子 | 分母 / 说明 |
| --- | --- | --- |
| 咨询提交率 | `consultation_submit_success` | `consultation_form_view` |
| 工程询盘 | `consultation_lead_created` 且 `direction=project` | 每日首次成功创建的线索数 |
| 渠道申请 | `consultation_lead_created` 且 `direction=channel` | 每日首次成功创建的线索数 |
| 案例深度 | `case_depth_reached` 且 `depth=90` | `case_detail_view` |
| 产品页转化 | `product_consultation_click` | `product_detail_view` |
| 下载数量 | `download_requested` | 只表示已点击下载，不等同于文件传输完成 |

补充事件 `consultation_form_started` 用于按咨询方向观察任务书开始量。案例深度仅记录 50% 和 90% 两个阈值；产品和案例只记录公开来源 ID。

## 上线前核验

1. 完成 2026-07-22 版隐私文本和负责人签核，再把 `ANALYTICS_PRIVACY_APPROVED` 设为 `true`。
2. 应用 D1 迁移并验证插入、聚合和定时删除。
3. 在 Cloudflare 边缘为 `/api/analytics` 配置速率限制，验证命中与误伤后再把 `ANALYTICS_EDGE_RATE_LIMIT_VERIFIED` 设为 `true`。
4. 确认内容白名单与当前产品、案例和已批准下载完全一致。
5. 使用与生产相同的 `NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED=true` 构建真实预览，验证浏览器包确实发送固定事件后，再把 `ANALYTICS_CLIENT_BUILD_VERIFIED` 设为 `true`。
6. 同时开启服务端写入与浏览器开关；发布检查会拒绝部分开启或缺少客户端构建证明的状态。
7. 通过真实预览验证 CSP、Beacon、随机 ID 拒绝、D1 行数和同日聚合；聚合结果只作为方向性指标。
