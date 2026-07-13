# JUHAO 访客站 API 契约

本文档定义访客站的数据接口。产品、网点、搜索与资讯仍由 `lib/api/http.ts` 在 Mock 和正式 CMS
之间切换；咨询回访固定使用同源 `/api/contact`，不因咨询上线而切换其他数据源。

## 启用方式

```env
NEXT_PUBLIC_JUHAO_API_BASE_URL=https://api.juhao.com/v1/
JUHAO_LEAD_WEBHOOK_URL=
JUHAO_LEAD_WEBHOOK_SECRET=
```

- 正式环境的 API 根路径必须使用 HTTPS；仅本地开发允许 `localhost` 或 `127.0.0.1`。
- 接口应返回 JSON，可直接返回正文，也可使用 `{ "data": ... }` 包装一层。
- 浏览器请求携带 Cookie；跨域部署时，后端必须配置精确的允许来源和凭据策略。
- 所有响应在进入页面前执行运行时结构校验。HTTP 错误、10 秒超时或结构不匹配均进入页面已有的失败/重试状态。
- `JUHAO_LEAD_WEBHOOK_URL` 为可选的企业内部通知地址，只能在服务端运行环境中配置；签名密钥同样不得使用 `NEXT_PUBLIC_` 前缀。
- 咨询提交必须同源，并使用 Sites 的 `DB` D1 绑定保存；Webhook 未配置或通知失败不会丢失已经保存的线索。

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
  "privacyVersion": "2026-07-13",
  "clientRequestId": "550e8400-e29b-41d4-a716-446655440000",
  "website": ""
}
```

枚举范围：

- `direction`：`home`、`project`、`channel`
- `source`：`home-hero`、`home-platform`、`home-contact`、`floating`、`footer`、`header`、`mobile-nav`、`products`、`product-topic`、`product-detail`、`cases`、`case-detail`、`partners`、`service-network`、`mall`、`direct`
- `sourceDetail`：只允许与产品专题、产品详情、案例详情和合作入口配合使用，最大 80 个字母、数字或连字符
- `scene`：`home-health`、`project`、`channel`
- `intent`：`space-advice`、`project-brief`、`partnership`
- `stage`：`understanding`、`planning`、`delivery`、`operation`
- `contactChannel`：`phone`、`email`、`wechat`；`contactValue` 按渠道执行对应格式校验
- `privacyVersion`：必须与页面当前说明版本一致；同意时间由服务端生成
- `clientRequestId`：浏览器生成的 UUID v4，同一正文重复提交返回同一线索；相同 ID 携带不同正文返回 `409`
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
隐私版本和幂等标识；先写入 D1，再尝试内部通知并记录结果。当前记录设置 180 日到期时间，
企业仍需按到期字段落实删除流程。正式公开前还应结合真实流量配置 Cloudflare Turnstile 或边缘限流；
蜜罐和同源校验不能替代面向公网的频率控制。
