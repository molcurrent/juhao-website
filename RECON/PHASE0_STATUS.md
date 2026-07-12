# NVC 实时取证状态

- 取证时间：2026-07-12T15:50:05+08:00
- 原站：https://www.nvc-lighting.com.cn/
- 目标模式：内容爆改 + 视觉复刻；复杂 WebGL / Canvas 效果先技术拆解和 baseline，再工程化。
- 复杂度预判：L5。依据是多页面 CMS、Three.js / ShaderPass、Canvas/JSMpeg、Swiper、TweenMax 及页面级 Ajax 状态并存。
- 上线边界：原站素材只作为结构、比例和动效证据；正式包使用钜豪品牌、自有文案与自有素材。

## 已确认的实时信号

- 首页返回 `200`，服务端为 nginx，页面仍是服务端 HTML + 前端增强结构。
- `/robots.txt` 当前返回 nginx `404`。
- `/sitemap.xml` 当前列出 64 个唯一 URL；相比旧的 23 条路由记录，新增了 `/about/duty` 和多条新闻详情，例如 `/news/132`。
- sitemap 内存在一个错误拼接 URL：`/about/https://www.nvc-lighting.com.cn/about/join`，不能直接把 sitemap 当作无条件正确的路由真相。
- 当前首页 hero 已引用 `/upfiles/onepage/202605/1778294964873.jpg`，说明旧镜像素材和页面状态已经漂移。
- 当前首页继续加载 TweenMax、Three.js、EffectComposer、ShaderPass、JSMpeg、Swiper、imagesloaded、jQuery mousewheel 与 `app.min.js?v=2`。
- 实时 `app.min.js?v=2` 与旧镜像文件 SHA-256 均为 `15f94b8abecc7063a9023ef8dd4614f1da160632d903ab0c4b348a8544e3ba10`，因此旧镜像中的压缩 JS 可继续作为当前交互源码证据；页面内容与素材仍须按实时页面重抓。
- 实时 `style.min.css`、`respond.css`、`main.js` 也分别与旧镜像同名文件哈希一致；当前变化主要集中在 CMS 输出、新闻路由和上传素材，而不是前端产物版本。
- 压缩 JS 当前仍包含四类 POST 请求：`/brand` 产品详情、`/service` 城市列表、`/service` 门店列表、`/investment` 省份代理信息。
- 当前 HTML 仍暴露 WebGL banner 数据、媒体 enter/hide/out 视频序列、滚动动画 class、业务详情入口、搜索、下载、服务与招商导航。

## Coze Code 状态

- 已按工程工作流安装 `@coze/cli@0.3.4`。
- `coze auth status --format json` 返回 `logged_in: false`。
- 因未登录，尚未读取或创建 Coze 项目；当前 Sites 工作区仍是唯一代码基线，避免并行工程分叉。

## 本阶段待产物

- 三档截图与全局侦察 JSON
- 当前路由地图及逐路由页面证据
- 网络请求与接口 fixture
- hover / click / scroll / 轮播等交互矩阵
- 素材清单、动效清单、接口清单
- source map 结果与 WebGL baseline 取证范围
