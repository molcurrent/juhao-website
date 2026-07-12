# JUHAO 访客站 API 契约

本文档定义 `lib/api/http.ts` 当前接受的正式接口。未配置
`NEXT_PUBLIC_JUHAO_API_BASE_URL` 时，站点使用本地 Mock 数据；Mock 只用于页面演示，
不代表真实产品、门店、合作区域或企业联系方式。

## 启用方式

```env
NEXT_PUBLIC_JUHAO_API_BASE_URL=https://api.juhao.com/v1/
NEXT_PUBLIC_JUHAO_CONTACT_ENABLED=false
```

- 正式环境的 API 根路径必须使用 HTTPS；仅本地开发允许 `localhost` 或 `127.0.0.1`。
- 接口应返回 JSON，可直接返回正文，也可使用 `{ "data": ... }` 包装一层。
- 浏览器请求携带 Cookie；跨域部署时，后端必须配置精确的允许来源和凭据策略。
- 所有响应在进入页面前执行运行时结构校验。HTTP 错误、10 秒超时或结构不匹配均进入页面已有的失败/重试状态。
- 只有咨询存储、隐私说明和受理流程全部确认后，才把 `NEXT_PUBLIC_JUHAO_CONTACT_ENABLED` 设为 `true`。

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

`POST contact`，请求正文：

```json
{
  "direction": "lighting",
  "project": "80㎡住宅，正在规划照明",
  "stage": "planning",
  "need": "希望改善客餐厅不同活动下的照明层次",
  "contactName": "李女士",
  "contactMethod": "user@example.com"
}
```

枚举范围：

- `direction`：`lighting`、`smart`、`channel`
- `stage`：`understanding`、`planning`、`delivery`、`operation`

成功响应：

```json
{
  "id": "JUHAO-20260712-0001",
  "status": "received",
  "submittedAt": "2026-07-12T10:00:00+08:00"
}
```

后端仍需独立完成频率限制、CSRF/来源校验、字段长度限制、日志脱敏、权限控制、
保留期限和删除机制；前端校验不能代替服务端安全控制。
