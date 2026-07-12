# Sitemap 漂移与可信度审计

取证时间：2026-07-12。

## 当前事实

- 实时 sitemap 有 64 个唯一 URL。
- 旧路由抓取有 24 个条目，其中 23 个 HTML 页面与 1 个 PDF。
- 实时 sitemap 新增 `/about/duty`、`/news/132`、`/news/131`、`/news/130` 等大量新闻详情。
- 实时 sitemap 将加入页面错误拼接成 `/about/https://www.nvc-lighting.com.cn/about/join`；真实导航仍指向 `/about/join`。
- 实时 sitemap 没有列出当前首页导航可访问的 `/news`、`/esg`、`/search`，也没有旧路由中的 `/download`、`/law`、`/privacy`。
- 逐页实时检查确认 `/news`、`/esg`、`/download`、`/search`、`/law`、`/privacy` 和 `/about/duty` 均返回 `200`；页脚仍暴露的 `/about/talent` 返回 `404`，不应复制成正式路由。

## 结论

Sitemap 只能作为新闻详情发现源，不能作为完整路由真相。最终路由地图必须合并：

1. 首页及页脚的实时内部链接；
2. 当前 sitemap 的新闻详情；
3. 浏览器 route crawl 实际返回 `200` 且有可见内容的页面；
4. 表单 action、Ajax 端点和运行时跳转目标。

旧的 23 条 HTML 路由只用于漂移对照，不能直接作为本轮验收清单。
