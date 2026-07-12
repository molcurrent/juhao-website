# 原站动效与交互清单

证据口径：`SOURCE` 为实时 DOM、浏览器状态或当前线上 bundle；`PARTIAL` 为能定位实现但缺逐帧参数；`GUESS` 不进入生产实现。

| 页面域 | 状态 / 动效 | 当前证据 | 证据级别 | 新工程承接 |
|---|---|---|---|---|
| 全站 | 91 帧 Canvas loading、百分比、遮罩退出 | 实时首页 `#load`；首次交互探针被 `.frame__load` 拦截，进度从 0% 到 100% | SOURCE | `PageLoader`，自有轻量帧/遮罩；等待关键资源，超时可跳过 |
| 全站 | PC 一级/二级导航 hover；滚动状态；移动端抽屉与二级展开 | 实时 PC/app nav DOM；`initFn.app_nav` | SOURCE | `SiteHeader` 独立状态机 + GSAP timeline；已覆盖 focus trap、背景 inert、滚动锁与焦点回送 |
| 全站 | 滚动入场、数字递增、返回顶部 | `.scroll-animate`、`data-effect/data-delay`、`init`、`run.js` | SOURCE | `SiteMotion` + ScrollTrigger；`FloatingActions` 已承接返回顶部，数字递增按真实数据页面补充 |
| 首页 Hero | 多帧背景/标题状态、页码与主视觉切换 | `bannerSlider`、hero data-banner、3 个 1440 canvas | SOURCE | 首屏时间线 + 自有素材；复杂切换先做 baseline |
| 首页 Hero | WebGL 噪声位移转场 | `glSlider` fragment shader，Three.js/EffectComposer/ShaderPass；实时 WebGL warning | SOURCE | 单独 `HeroDisplacement`，复用真实 shader 逻辑的自有素材版本 |
| 首页业务 | 场景/产品 Tab、hover 图文切换、热点进入、横向内容移动 | `homeFn.go/media`、`r3Fn`、`tabClick`、TweenMax x/opacity | SOURCE | `SceneExplorer` + GSAP context，键盘/触摸等价 |
| 首页媒体 | 桌面 MP4 交替、移动端 JSMpeg Canvas | 49 个 MP4 引用；`Vfn`、`data-in/out/from/hide` | SOURCE | 标准 video 优先；移动端不再使用 MPEG-TS，提供静态/短视频降级 |
| 首页资讯 | Swiper 图文同步、前后按钮 | `new Swiper(... speed:1000)` + `homeFn.go` | SOURCE | `Carousel` + 可暂停/键盘/触摸 |
| About | 三层循环轮播、图片缩放与文案同步 | `aboutFn.SwLoop`；移动端 Swiper | SOURCE | 已用 `AccessibleCarousel` + 自有素材实现三层画框、图文同步、自动播放、暂停、键盘与触摸；reduced-motion 下静态呈现 |
| History | 时间线内容随滚动进入 | 实时页面结构与 scroll classes | PARTIAL | 先用 ScrollTrigger 段落 reveal，逐段截图校准 |
| Join | 招聘入口与环境轮播 | 实时页面 Swiper 结构；通用初始化 | SOURCE | `CareerGallery` + 自有招聘内容 |
| Business | 场景 WebGL、分类 Tab、产品列表“更多”、横向优势、产品弹窗 | `businessFn.tab/swChange`、`goPop`、`POST /brand` | SOURCE | `BusinessScenePage` + Mock products + accessible Dialog |
| Healthy | 长页叙事、多组桌面/移动轮播与 slideChange 联动 | 实时 `/healthy` 结构、页面内联 Swiper | SOURCE | 按 section 建 timeline；轮播统一组件 |
| ESG | 自动横向轮播、图文联动、图片放大层 | `page._esg`、多组 Swiper、`#popImg` | SOURCE | `SustainabilityStory` + Carousel + Lightbox |
| Service | 售后展开、FAQ 展开/加载更多、质保 Tab | `serviceFn.go_down/qaMore` | SOURCE | Accordion + progressive list，覆盖 load/empty/error |
| Service | 省→市→门店 | `serviceFn.selectFn`、两个 `/service` POST | SOURCE | `LocationFinder` + typed adapter |
| Investment | 两组 Canvas 时钟/时间线、招商 Tab、轮播、区域联系人 | `investFn.clock/clock_btm`、Swiper、`selectFn2` | SOURCE | `PartnerTimeline` + RegionSelector；Canvas 可改 GSAP/SVG/CSS |
| Search | GET 查询、返回/关闭、移动端全屏高度 | `/search?keywords=`、`#search` 初始化 | SOURCE | server/client search state + loading/empty/error |
| Download | 项目展开与下载反馈 | `/download` 结构、`serviceFn.go_down` | SOURCE | `DownloadList` + file metadata/status |

## 时序与清理标准

- 复杂时间线统一使用 GSAP；每个页面通过 context 清理，路由离开后不得残留 ScrollTrigger 或 RAF。
- 简单 hover、颜色和 opacity 反馈使用 CSS；不引入第二套复杂动画运行时。
- 只动画 `transform`、`opacity` 和裁切层，避免在滚动中高频改布局。
- `prefers-reduced-motion` 下直接呈现终态，轮播不自动播放，WebGL/视频使用静态 poster。
- loader 不能永久阻塞操作；首屏资源失败或超时后必须可进入页面。

## Baseline 闸门

- Hero WebGL、首页 Canvas 帧序列和招商 Canvas 时间线在工程化前分别建立最小 baseline。
- 真实 shader、纹理尺寸、progress 范围、资源时序为 SOURCE；视觉手调值仍标 `GUESS`。
- 未通过多帧对照前，不用调亮度、速度或偏移去掩盖坐标/时序问题。
