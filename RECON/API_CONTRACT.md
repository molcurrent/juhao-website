# JUHAO 访客站 API 契约

本文档定义访客站的数据接口。产品、服务、搜索与资讯直接读取本地治理数据；咨询回访固定使用
同源 `/api/contact`，不因咨询上线而切换其他数据源。

## 启用方式

```env
PUBLIC_INTAKE_READY=false
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_ALLOWED_HOSTNAMES=
CONTACT_EDGE_RATE_LIMIT_VERIFIED=false
JUHAO_LEAD_WEBHOOK_URL=
JUHAO_LEAD_WEBHOOK_SECRET=
JUHAO_LEAD_MAINTENANCE_SECRET=
JUHAO_LEAD_RATE_LIMIT_SECRET=
```

- 正式环境的 API 根路径必须使用 HTTPS；仅本地开发允许 `localhost` 或 `127.0.0.1`。
- 接口应返回 JSON，可直接返回正文，也可使用 `{ "data": ... }` 包装一层。
- 浏览器请求携带 Cookie；跨域部署时，后端必须配置精确的允许来源和凭据策略。
- 所有响应在进入页面前执行运行时结构校验。HTTP 错误、10 秒超时或结构不匹配均进入页面已有的失败/重试状态。
- `JUHAO_LEAD_WEBHOOK_URL` 为可选的企业内部通知地址，只能在服务端运行环境中配置；签名密钥同样不得使用 `NEXT_PUBLIC_` 前缀。
- 咨询提交必须同源，并使用 Sites 的 `DB` D1 绑定保存；Webhook 未配置或通知失败不会丢失已经保存的线索。
- 公开入口要求 Turnstile 公私钥、`TURNSTILE_ALLOWED_HOSTNAMES` 明确主机名白名单、至少 32 个字符且独立生成的 `JUHAO_LEAD_RATE_LIMIT_SECRET`，以及已经过负责人验收的 Cloudflare 边缘/WAF 前置限流。主机名不含协议、端口或路径；未验收时不得把 `CONTACT_EDGE_RATE_LIMIT_VERIFIED` 改为 `true`。

## 只读接口

| 方法 | 路径 | 查询参数 | 返回数据 |
| --- | --- | --- | --- |
| GET | `products` | `sceneId` 可选 | `ProductCard[]` |
| GET | `service/regions` | 无 | `ServiceRegion[]` |
| GET | `service/locations` | `city` 可选 | `ServiceLocation[]` |
| GET | `partners/regions` | 无 | `PartnerRegion[]` |
| GET | `search` | `q` | `SearchResult[]` |
| GET | `news` | `page`、`pageSize` | `NewsPageResult` |
| GET | `downloads` | 无 | `DownloadItem[]` |

资讯分页响应示例：

```json
{
  "items": [
    {
      "path": "/news/example",
      "title": "文章标题",
      "description": "文章摘要",
      "image": "/images/example.webp",
      "published": "2026-07-12"
    }
  ],
  "page": 1,
  "pageSize": 6,
  "total": 1,
  "totalPages": 1
}
```

## 咨询提交

`POST /api/contact`，请求正文：

```json
{
  "direction": "home",
  "source": "home-hero",
  "sourceDetail": "可选的产品、专题、案例或合作入口标识",
  "scene": "home-health",
  "intent": "space-advice",
  "project": "80㎡住宅，正在规划照明",
  "stage": "planning",
  "need": "希望改善客餐厅不同活动下的照明层次",
  "contactName": "李女士",
  "contactChannel": "email",
  "contactValue": "user@example.com",
  "consent": true,
  "privacyVersion": "2026-07-18",
  "clientRequestId": "550e8400-e29b-41d4-a716-446655440000",
  "turnstileToken": "公开入口由 Turnstile 生成的单次令牌",
  "website": ""
}
```

枚举范围：

- `direction`：`home`、`project`、`channel`
- `source`：`home-hero`、`home-platform`、`home-contact`、`floating`、`footer`、`header`、`mobile-nav`、`products`、`product-topic`、`product-detail`、`cases`、`case-detail`、`solutions`、`partners`、`service-network`、`mall`、`direct`
- `sourceDetail`：只允许与产品专题、产品详情、案例详情和合作入口配合使用，最大 80 个字母、数字或连字符
- `scene`：`home-health`、`project`、`channel`
- `intent`：`space-advice`、`project-brief`、`partnership`
- `stage`：`understanding`、`planning`、`delivery`、`operation`
- `contactChannel`：`phone`、`email`、`wechat`；`contactValue` 按渠道执行对应格式校验
- `privacyVersion`：必须与页面当前说明版本一致；同意时间由服务端生成
- `clientRequestId`：浏览器生成的 UUID v4，同一正文重复提交返回同一线索；相同 ID 携带不同正文返回 `409`
- `turnstileToken`：公开入口必填；客户端固定 `action=juhao-contact`，服务端同时核验 `success`、`action`、请求主机名和允许主机名白名单
- `website`：反垃圾蜜罐字段，真实访客保持为空

成功响应：

```json
{
  "id": "JUHAO-20260713-12AB34CD",
  "status": "received",
  "submittedAt": "2026-07-13T02:00:00.000Z"
}
```

接口限制 16 KB JSON 正文，要求同源 `Origin`，校验字段长度、方向与场景组合、联系渠道、
隐私版本和幂等标识。公开模式还要求 Cloudflare 提供格式有效的 `CF-Connecting-IP`：先完成
Turnstile 校验，再以服务端密钥对该地址生成 HMAC-SHA-256 摘要，并在 D1 中执行每个摘要
约 10 分钟 8 次的业务提交限额；原始 IP 不写入 D1。摘要正常运行下于到期后的下一次每日维护清理，
维护任务异常时在恢复后补清理。

D1 业务限额只统计通过 Turnstile 的请求，不能替代 Cloudflare 边缘/WAF 前置限流。缺少可信客户端
地址、Turnstile 上游超时、网络错误、HTTP 429/5xx 或 `internal-error` 返回 `503`；令牌无效以及
`action`、主机名不匹配返回 `403`。校验和限流通过后先写入 D1，再尝试内部通知并记录结果。
线索记录设置 180 日到期时间，企业仍需按到期字段落实删除流程。
