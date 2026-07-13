# 正式域名、商城分流与上线监控

更新日期：2026-07-13

## 当前状态

- 新站生产预览已由 Sites 承载，但 Sites 项目尚未绑定自定义域名。
- `www.juhao.com` 当前仍是旧商城入口，并承载登录、采购、订单与经销商业务。
- 新站已把品牌、产品、案例、知识和合作咨询集中在 `www.juhao.com` 信息架构；商城链接统一指向 `mall.juhao.com`。
- 已确认的 6 条垃圾 URL 在新站 Worker 中返回 410，并附带 `X-Robots-Tag: noindex`。
- `/login.html` 在新站切换后会永久跳转至 `https://mall.juhao.com/login.html`。

## 域名切换顺序

1. 在旧服务器隔离并清除恶意文件、数据库注入和异常任务，轮换全部发布凭证。
2. 将现有商城完整迁移到 `mall.juhao.com`，验证登录、采购、订单、支付与经销商业务。
3. 在 Sites 中添加 `juhao.com` 和 `www.juhao.com`，取得 DNS 验证记录，但暂不切换访问流量。
4. 预先降低旧 DNS TTL；在维护窗口修改 DNS，并保留旧站只读回退方案。
5. 验证核心页面、sitemap、canonical、结构化数据、商城跳转和垃圾 URL 410。
6. 向搜索平台提交新 sitemap、合法 301 映射与垃圾 URL 移除申请。

## 自动验收

切换后运行：

```bash
BASE_URL=https://www.juhao.com node scripts/check_launch_health.mjs
```

脚本检查：

- 8 条核心路由返回 200、存在 canonical、无 NVC/雷士/CNZZ 残留；
- 6 条已确认垃圾 URL 返回 410 且带 `noindex`；
- `/login.html` 跳转到独立商城；
- sitemap 可访问且至少包含 60 条 URL。

## 持续监控

- 每 5 分钟：主页、产品中心、案例中心、联系页和商城登录可用性。
- 每小时：新增 5xx、异常 404、垃圾目录、登录跳转和 sitemap 状态。
- 每日：搜索索引量、品牌关键词、垃圾 URL 回收状态、Core Web Vitals。
- 每周：表单来源、产品详情访问、工程咨询、渠道咨询与商城跳转转化。

## 尚需外部权限

正式切换仍需要 DNS、旧服务器、商城部署和搜索平台权限。当前仓库已经具备切换后的路由、410、监控脚本和商城分流，但未执行会影响现有用户的 DNS 变更。
