# NVC → JUHAO L5 技术拆解

状态：阶段 0 技术基线，2026-07-12
用途：指导 JUHAO 公开版本的可维护重构；不是原站代码移植说明。
范围：访客侧 SSR 页面、前端增强、动效、媒体与只读查询交互。

## 证据口径

- **SOURCE**：实时页面、实时浏览器状态、实时网络记录，或当前线上 bundle 中可以直接确认的事实。
- **PARTIAL**：能确认结构或算法方向，但缺少逐帧、全路由或全部输入条件验证。
- **GUESS**：尚未被证据支持的视觉手调值或实现推测。GUESS 不得直接进入生产验收基线。
- 原站内容、图片、视频、字体文件、联系人和统计脚本只作取证，不进入 JUHAO 发布包。

主要证据：

| 证据 | 已确认内容 | 等级 |
|---|---|---|
| `RECON/original/original-recon.json` | 1440 / 768 / 390 三档运行时；首页分别为 6119 / 6014 / 5414px 长；1440 下 3 Canvas、8 video、67 image、21 script，竖屏为 3 Canvas、3 video | SOURCE |
| `RECON/original/routes/original-route-map.json` | 当前同站 crawl 得到 25 个 200 页面及页面标题、H1、链接数 | SOURCE |
| `RECON/original/network/original-network.json` | 首页 257 个请求/响应；212 image、7 media、21 script、6 stylesheet、6 xhr | SOURCE |
| `RECON/original/asset-manifest.json` | 52/52 取证资源成功，合计 5,894,254 bytes；包括 19 script、33 image | SOURCE |
| `RECON/original/interactions/settled/original-settled-interactions.json` | loader 结束后的 25 个动作；9 个发生可观察变化；12 个二级菜单动作因缺父级 hover 前置而超时；3 个 Canvas drag 中 2 个有状态变化 | SOURCE / PARTIAL |
| `RECON/API_EVIDENCE.md` | 产品详情、城市、门店、招商联系人四类查询参数与响应字段 | SOURCE |
| `RECON/MOTION_INVENTORY.md` | 页面域动效清单及新工程承接边界 | SOURCE / PARTIAL |
| `RECON/original/sourcemaps/VALIDATION.md` | 19 个脚本没有有效公开 source map；两个 `ok` 是查询串拼接造成的假阳性 | SOURCE |
| `RECON/original/assets/www.nvc-lighting.com.cn/zhcool.min-c58ab80891.js` | loader、平滑滚动、Canvas 遮罩、WebGL 容器、导航颜色等运行代码 | SOURCE（本地取证文件，不发布） |
| `RECON/original/assets/www.nvc-lighting.com.cn/app.min-af09ab63f8.js` | 页面识别、Swiper、产品弹窗、服务/招商 Ajax、视频切换及 fragment shader 调用 | SOURCE（本地取证文件，不发布） |

## 1. 结论

原站是 **SSR HTML + 页面级前端增强**，不是 SPA。HTML 先提供导航、正文、媒体占位与页面标识；jQuery 代码按 `article` id 初始化对应模块。动画层同时使用 TweenMax、Anime、Three.js、Swiper、JSMpeg 和多个 `requestAnimationFrame` 循环，因此属于 L5：难点不在页面数量，而在相互叠加的资源时序、画布坐标、媒体状态和页面级清理。

JUHAO 版本应保留：

- 可抓取的 SSR 正文、页面族与信息节奏；
- 首屏遮罩、场景转场、轮播、滚动入场、弹层和查询流程的可观察状态；
- 桌面与竖屏不同的交互密度。

JUHAO 版本不应保留：

- 原站的大而全单体脚本、jQuery DOM 拼接和 `eval` 解析；
- 固定 6 秒不可操作、未受控 DPR、移动端 MPEG-TS/JSMpeg 路径；
- 原站素材、原站接口、原站联系人、CNZZ 统计及任何追踪标识；
- 仅为“像”而复制的无障碍缺陷、导航遮挡或 scroll hijack。

## 2. 渲染架构与层级

### 2.1 原站运行架构

```text
nginx / CMS
  └─ SSR HTML
      ├─ PC / mobile 双导航
      ├─ article#home / #about / #business / #service ...
      ├─ DOM 正文、按钮、热点、分页、弹层容器
      ├─ data-* 中的图片、帧目录、视频和产品 id
      └─ 页面尾部脚本
          ├─ 基础：jQuery、main、classie
          ├─ 动效：TweenMax、Anime、Swiper
          ├─ 图形：Three、EffectComposer、ShaderPass
          ├─ 媒体：原生 video、JSMpeg Canvas
          └─ 业务：zhcool.min.js、app.min.js
```

页面识别器直接查询 `#home`、`#about`、`#business`、`#service`、`#investment`、`#download`、`#esg` 等节点，只初始化当前页面模块。该事实来自 `RECON/original/assets/www.nvc-lighting.com.cn/app.min-af09ab63f8.js`，为 **SOURCE**。

### 2.2 可观察的视觉层级

以下是结构层级，不声称复原未知的每一个 z-index 数值：

```text
全屏 loader overlay（首次桌面会话）
固定导航 / 移动抽屉
页面 article
  ├─ SSR DOM 文案与交互控件
  ├─ 媒体容器
  │   ├─ 当前/下一张背景图
  │   ├─ 2D Canvas 遮罩或 WebGL Canvas
  │   ├─ 双 video 层或移动 Canvas 播放层
  │   └─ 页码、箭头、Tab、热点
  └─ 各 section 的滚动入场层
产品 / 图片 lightbox overlay
桌面自定义光标
Footer / 返回顶部
```

- **SOURCE**：首页三档均存在 3 个 Canvas；1440 下存在 8 个 video，竖屏仅 3 个；见 `RECON/original/original-recon.json`。
- **SOURCE**：`frameCanvas` 使用 2D Canvas 和 `destination-out` 做圆形扇区遮罩；`glSlider` 向目标容器插入 WebGL Canvas；见 `RECON/original/assets/www.nvc-lighting.com.cn/zhcool.min-c58ab80891.js`。
- **PARTIAL**：弹层、导航、Canvas、video 的相对覆盖关系可由截图和 DOM 确认，但当前证据未输出完整 computed z-index 表，因此不得凭感觉硬编码原数值。

### 2.3 JUHAO 目标架构

SSR 页面必须先输出可读正文、导航、链接和表单；Canvas、WebGL、video、GSAP 只做渐进增强。页面在 JS、WebGL 或媒体失败时仍能完成浏览、跳转、查询和产品详情阅读。

建议边界：

```text
Layout
  ├─ SiteHeader + DesktopMegaNav + MobileNav
  ├─ PageLoader
  ├─ PageTransition / MotionProvider
  └─ SiteFooter

features
  ├─ home
  ├─ brand / history / careers
  ├─ business / product-dialog
  ├─ healthy
  ├─ sustainability
  ├─ service / location-finder
  ├─ investment / region-selector
  ├─ news / search
  └─ downloads / legal

lib
  ├─ motion（GSAP 注册、matchMedia、cleanup）
  ├─ media（poster、video、WebGL capability）
  └─ api（typed adapter；Mock 与未来 CMS 同接口）
```

路由边界以 `RECON/ROUTE_CONTRACT.md` 为准。业务页面不得继续由一个通用 catch-all 模板冒充。

## 3. 启动与资源时序

### 3.1 原站关键时序

1. **SOURCE**：SSR HTML 到达后依次加载基础工具、TweenMax、Three.js 后处理、图片检测、Anime、JSMpeg、Swiper、`zhcool.min.js` 与 `app.min.js`；脚本列表见 `RECON/original/original-recon.json`。
2. **SOURCE**：首次桌面会话且 `sessionStorage.key` 不存在时，创建 `loadFrames`；竖屏或同一会话再次进入首页则直接移除 loader。
3. **SOURCE**：loader 读取 Canvas 的帧路径与帧数，逐张加载 JPG，以 cover 方式绘制，进度显示 0–100。当前页面结构显示 91 帧；见 `RECON/MOTION_INVENTORY.md`。
4. **SOURCE**：首次桌面首页锁定 `body` 纵向滚动；3 秒后创建 hero `frameCanvas`；6 秒后恢复滚动并取消 loader RAF。loader 内另有 Canvas 淡出、Logo 淡出和 SVG/遮罩旋转时间线。
5. **SOURCE**：`frameCanvas` 的自动切换间隔为 5 秒；仅当 Canvas 与视口有交集时启动 timer，离开视口时清除 timer。
6. **SOURCE**：页面级 `app.min.js` 随后按页面 id 初始化 Swiper、视频、产品、FAQ、区域选择等。

### 3.2 原站时序风险

- loader 的固定 6 秒锁滚动与真正的首屏可用状态并不严格绑定；慢网和快网都可能得到不合理等待。
- 帧图加载错误会被 resolve，进度和画面可能不同步。
- 多个库与媒体并发加载；首页网络记录为 257 个请求，其中 212 个图片请求、7 个媒体请求，见 `RECON/original/network/original-network.json`。
- `glSlider`、平滑滚动、招商 Canvas 等各有 RAF；未见统一的路由卸载/可见性调度器。

### 3.3 JUHAO 资源时序

1. SSR HTML、关键 CSS、首屏 poster 先到；导航与正文立即可操作。
2. loader 只等待 JUHAO 首屏必要资源，并设置最大等待时间；失败直接进入静态终态。
3. GSAP/ScrollTrigger 按页面加载；Three.js 只在含 WebGL 组件且能力检测通过时动态加载。
4. WebGL 只预热当前纹理和下一纹理；离开视口暂停 RAF，路由离开释放 renderer、材质、几何体和纹理。
5. video 默认 `preload="metadata"`，先显示自有 poster；进入临近视口后再加载媒体。
6. 轮播、FAQ、查询和 Dialog 不等待 WebGL 或 video，确保核心交互独立可用。

## 4. 全站状态机

### 4.1 Loader

| 状态 | 原站证据 | JUHAO 实现 |
|---|---|---|
| `idle` | 非首页、竖屏或会话内再次访问直接跳过 | SSR 默认页面可读；仅在客户端确认需要后显示非阻塞遮罩 |
| `loading` | 帧图加载、Canvas 逐帧、百分比增长 | 只等关键资源；进度表示真实 Promise 完成比例 |
| `exiting` | Canvas、Logo、底部遮罩依次退出 | 单个 GSAP timeline；不可拦截焦点；支持立即跳过 |
| `done` | `#home.on`，恢复滚动 | 移除遮罩、恢复滚动、聚焦主内容；路由切换不重复 |
| `failed/timeout` | 原站无明确独立状态 | 强制进入 `done`，静态 poster 兜底 |

可接受偏差：不复刻 91 张原站帧图，也不复制固定 6 秒等待。视觉上保留“品牌标识 → 有意义进度 → 遮罩揭开”三拍即可。

### 4.2 导航

**SOURCE**：

- PC 为一级菜单 + 二级面板；settled probe 中“业务品牌” hover 可观察到 DOM/可见状态变化。
- 移动端 `app_nav` 有 `closed/open`、当前一级 `isDown` 和三级项状态；打开给容器与顶部加 `.on`，二级用 `.active`。
- `navColor` 根据 section 的 `data-nav` 切换三种导航主题：默认、`.mbg`、`.nbg`。

**PARTIAL**：二级项必须先激活父级；通用探针未保持 hover 前置，导致 12 次动作被正文层拦截。该结果证明测试序列不足，不证明二级链接失效。见 `RECON/original/interactions/settled/original-settled-interactions.json`。

JUHAO 导航状态：

```text
desktop: closed -> mega-open(section) -> closed
mobile:  closed -> drawer-open -> group-open(id) -> nested-open(id)
scroll:  transparent | light | dark
modal:   normal | scroll-locked
```

必须补充原站未证明的生产要求：键盘 focus 展开、Esc 关闭、焦点回送、触屏点击等价、抽屉滚动锁和路由变化后自动关闭。hover 延迟和面板精确位移在逐帧校准前标 **GUESS**。

### 4.3 滚动与段落入场

- **SOURCE**：桌面 `SmoothScroll` 把滚动容器固定在视口，以 `lerp(..., 0.1)` 平滑到原生 scroll 值，并用 `translate3d` 更新；横向页面可切换到 X 轴。
- **SOURCE**：`.scroll-animate` 按元素 top 和 `data-offT` 进入/退出；导航主题与 section top - 80px 绑定。
- **PARTIAL**：所有路由是否都启用固定 wrapper、每个元素的确切 effect/delay 尚未逐路由导出。

JUHAO 不复制 scroll hijack。使用原生滚动 + ScrollTrigger 实现同等的 reveal、进度和横向段落；只动画 transform、opacity 与 clip。`prefers-reduced-motion` 下直接显示终态。

## 5. 页面交互拆解

### 5.1 Swiper / Carousel

**SOURCE**：首页资讯、About、Join、Business、Healthy、ESG、Investment 均创建 Swiper；常见速度为 1000ms，部分为 `slidesPerView: auto`、loop、centered，slideChange 同步文案和两位页码。见 `RECON/MOTION_INVENTORY.md` 与 `RECON/original/assets/www.nvc-lighting.com.cn/app.min-af09ab63f8.js`。

JUHAO 统一为一个可访问 Carousel 封装：

- 同步 `activeIndex`、文案、页码、进度条；
- 前后按钮是真正的 button，提供可读 label；
- 支持键盘、触摸、拖动、暂停自动播放；
- 隐藏 slide 不进入错误的 tab 顺序；
- reduced-motion 停止 autoplay，转场降为短 crossfade 或即时切换。

精确 slide 宽度、初始索引和 loop 规则由每个页面 fixture 配置，不能用一个全站默认值猜测。

### 5.2 业务 Tab、热点、产品列表与弹窗

**SOURCE**：

- 分类 Tab 切换对应产品容器；桌面每 4 个产品为一组并有“更多”，竖屏改为两列/两项分组 Swiper。
- 场景热点 `.tabClick` 切换媒体、文案和产品组。
- 点击 `.goPop` 后 `POST /brand`，以 `products_id` 获取标题、英文标题、主视频或主图、详情图和关联产品；响应字段见 `RECON/API_EVIDENCE.md`。
- 原站通过字符串拼 HTML，并用 `eval("(" + res + ")")` 解析。

JUHAO 状态：

```text
scene(activeScene)
  -> category(activeCategory)
  -> products(collapsed | expanded)
  -> product-dialog(closed | loading | ready | empty | error)
```

实现要求：

- 页面只依赖 typed `ProductRepository`，初版返回 JUHAO Mock；不得调用原站 `/brand`。
- Dialog 打开后锁背景滚动、聚焦标题/关闭按钮，Esc 和遮罩可关闭，关闭后把焦点还给触发卡片。
- 加载、空数据、失败和重试必须可见；视频失败回退主图，主图失败回退品牌占位。
- 相关产品点击只更新 Dialog 内容，不销毁焦点语义。
- 原站弹层的精确尺寸与图片长宽比需由 JUHAO 素材决定，不能复制原素材尺寸当规范。

### 5.3 Service：FAQ、质保、城市与门店

**SOURCE**：

- `go_down` 控制政策/下载类内容的高度展开；质保使用 Tab。
- `qaMore` 初始按组展示 FAQ，存在“加载更多”；现有逻辑以 5 条为步长。
- 省份选择后 `POST /service { get_city, province }` 得到城市字符串数组；城市选择后 `POST /service { get_shop, city }` 得到门店标题和地址数组。

JUHAO 状态：

```text
faq: collapsed | expanded
faq-list: initial | more | exhausted
location: province-idle
       -> cities-loading -> city-ready | cities-empty | cities-error
       -> shops-loading  -> shops-ready | shops-empty | shops-error
```

每次省份变化必须清空旧城市和旧门店；每次城市变化必须取消或忽略旧请求，防止竞态覆盖。初版只使用钜豪 Mock 城市/网点，不显示原站门店。

### 5.4 Investment：时钟、Tab、轮播与区域联系人

**SOURCE**：原站有上下两组 Canvas 时钟/时间线、招商分类 Tab、多组 Swiper 和区域选择；Canvas 按弧线进度驱动 5 段节点，招商联系人通过 `POST /investment { get_agent, province }` 获取。见 `RECON/MOTION_INVENTORY.md`、`RECON/API_EVIDENCE.md` 和 app bundle。

**PARTIAL**：招商页没有完成独立逐帧交互探针，因此弧线与所有文案切换的精确相位仍需页面专项取证。

JUHAO 使用 SVG + GSAP 或 CSS progress 重建可读时间线，不要求继续用 Canvas。区域选择状态为 `idle/loading/ready/empty/error`，只接 Mock `RegionalPartnerContact`；联系人数据必须来自钜豪授权资料。

### 5.5 Search / Download / News

- **SOURCE**：搜索为 GET `keywords`；下载项可展开；新闻有列表、分页和详情族。见 `RECON/original/routes/original-route-map.json` 与 `RECON/MOTION_INVENTORY.md`。
- 搜索结果必须有 loading/empty/error，结果页索引策略按 `RECON/ROUTE_CONTRACT.md`。
- 下载必须展示文件类型、大小、更新时间和不可用反馈；不得复用原站 EXE/ZIP/PDF。
- 新闻分页越界返回 404；数字型原站详情不复制，使用 JUHAO slug 和自有正文。

## 6. Canvas、WebGL 与视频

### 6.1 首屏圆形 Canvas 遮罩

**SOURCE 算法**：

- Canvas 尺寸取 viewport；当前图先按 cover 裁切绘制。
- 合成模式切到 `destination-out`，以视口中心为圆心绘制扇区；角度从 0 推进到 200，揭开下一张背景图。
- 桌面半径参数约从 `0.4 * viewportHeight` 到 `1.5 * viewportHeight`，竖屏约从 `0.3` 到 `0.7`。
- 第一段角度时间线 0.7s、延迟 0.3s；第二段半径时间线 0.5s、延迟 0.8s；自动循环 5s。
- 代码证据：`RECON/original/assets/www.nvc-lighting.com.cn/zhcool.min-c58ab80891.js` 的 `frameCanvas`。

**PARTIAL**：真实浏览器合成后的有效 easing、文字出入场相位和不同图片焦点未逐帧量化。

JUHAO baseline：先用带中心线、四角标记和 safe-area 框的自制校准图验证 cover 坐标，再换 JUHAO 自有图片。验收帧为 0%、25%、50%、75%、100%；首尾必须与静态图完全对齐，不得出现白缝、黑边或半径不足。

### 6.2 WebGL 噪声位移转场

**SOURCE 算法结构**：

- `glSlider` 创建 Scene、PerspectiveCamera、PlaneGeometry 和 ShaderMaterial，Canvas 尺寸跟随容器。
- renderer 使用设备 DPR，纹理先加载后创建材质；当前纹理为 `texture1`，下一纹理为 `texture2`。
- vertex 只传递 UV。fragment 先按 `resolution.zw` 做 cover UV 修正，再以基于像素/分辨率的 hash noise 生成扰动。
- 位移主方向是垂直方向；两张纹理按 `progress` 在相反方向偏移，最后 `mix(texture1, texture2, progress)`。
- `progress` 从 0 到 1，默认转场时长 1s；完成后把 `texture2` 置为新的 `texture1`，并把 progress 复位。
- 代码证据：`RECON/original/assets/www.nvc-lighting.com.cn/zhcool.min-c58ab80891.js` 的 `glSlider` 与 `RECON/original/assets/www.nvc-lighting.com.cn/app.min-af09ab63f8.js` 的 fragment 参数。

**PARTIAL**：bundle 声明了多组未实际参与该 fragment 输出的 uniform；有效 easing 和真实帧间 GPU 结果未被性能 trace 证明。探针中的 Canvas drag 状态变化不能单独证明 Canvas 直接消费 drag，见 `RECON/original/interactions/settled/original-settled-interactions.json`。

**GUESS，禁止直接采用**：凭截图调强度、亮度、噪声尺度或偏移方向；在坐标与色彩空间未校准前用额外滤镜“修得更像”。

JUHAO clean-room baseline：

1. 使用两张自制棋盘格纹理，分别标 A/B、中心、四角与 10% 网格；不使用原站图片。
2. 固定容器为 1440×900、768×900、390×900，分别测试 DPR 1/2；生产 DPR 建议封顶，封顶值以性能验收决定。
3. 截取 progress `0 / .25 / .5 / .75 / 1`；先确认 cover UV，再确认位移，再确认 mix。首帧必须只显示 A，末帧只显示 B。
4. 只保留实际使用的 uniform；重新编写等价视觉逻辑，不复制原 fragment 文本。
5. 换 JUHAO 自有图片后检查 sRGB、透明度、焦点和裁切；桌面与竖屏分别定义焦点。
6. 测试 `webglcontextlost`、纹理 404、低端 GPU、后台标签页和路由离开；任一失败即时回退 CSS crossfade。
7. 组件卸载时取消 RAF、移除监听、dispose geometry/material/texture/renderer，并用自动化检查重复进出路由后 Canvas 数量不增长。

### 6.3 Loader Canvas

**SOURCE**：首次桌面会话使用 91 帧 JPG、cover 绘制、数字进度、Canvas/Logo/遮罩退出；探针初次执行被 `.frame__load` 拦截，等待结束后重新探测成功。见 `RECON/MOTION_INVENTORY.md` 和 `RECON/original/interactions/PROBE_NOTES.md`。

JUHAO 不复制 91 帧。可以用少量自有帧、SVG 或纯 GSAP 遮罩表达相同节拍。最大等待必须受控，`prefers-reduced-motion` 直接显示终态，任何失败不能永久遮挡页面。

### 6.4 视频与移动 Canvas

**SOURCE**：

- 桌面首页使用 before/after 两个 MP4 容器，播放开始后约 500ms 交换层级，并以约 0.6s opacity 淡出当前层。
- 竖屏用 JSMpeg 把 MPEG-TS 解码到 Canvas；切换时先播放 hide，再播放 show，并临时禁用 Swiper。
- `Vfn` 管理多个 `.video-parent` 的源、Canvas、播放/暂停与首帧显示。

JUHAO 使用标准 MP4/WebM `<video>` 和 poster，不引入 JSMpeg。双缓冲仅在确实需要无缝场景切换的区域使用；移动端优先单 video 或 poster。视频失败、save-data、reduced-motion、低电量场景均回退静态图。

## 7. 复杂效果 baseline 与可接受降级

| 效果 | 必须保留的体验 | baseline 通过条件 | 可接受降级 |
|---|---|---|---|
| 首次 loader | 品牌出现、进度、遮罩揭开 | 不阻塞超时；进度单调；结束后无 overlay/scroll lock | 静态 Logo 短淡出或直接进入 |
| Hero 圆形揭幕 | 当前/下一场景的明确空间转场 | 五个关键帧坐标正确；无缝；连续触发受锁 | CSS clip-path / crossfade |
| WebGL 位移 | 带纵向噪声的两图过渡 | 首尾纹理准确；三档无黑边；context 可释放 | CSS crossfade |
| Scroll reveal | 信息随滚动有节奏进入 | 原生滚动可用；回退终态；无残留 Trigger | 直接显示终态 |
| 平滑/横向段落 | 层级与进度感 | 键盘/触摸可达；不劫持主滚动 | 原生纵向布局 |
| Swiper | slide、文案、页码同步 | 鼠标/触摸/键盘可操作；可暂停 | CSS scroll-snap 或静态首项 |
| 场景视频 | 媒体切换不中断理解 | poster 可用；切换无闪黑；后台暂停 | poster + 文案 |
| 招商时钟 | 五段体系的进度表达 | 节点、文案、进度同步 | 静态 stepper |
| 鼠标视差/自定义光标 | 桌面精细反馈 | 仅 fine pointer；不挡点击；零持续泄漏 | 关闭 |
| 产品 Dialog | 不离页读取产品详情 | loading/ready/empty/error 完整；焦点闭环 | 独立详情页或页内展开 |

降级不是第二套内容：同一 SSR 内容和操作入口保持不变，只移除高成本视觉层。

## 8. 响应式模型

**SOURCE**：

- JS 核心分支主要用 `matchMedia("(orientation: portrait)")`，不是单一像素断点。
- CSS 还包含 1500、1366、1280、1024、700px 断点以及 landscape/portrait 分支；证据为 `RECON/original/network/fixtures/templates-dist-css-respond.css-bf5990253d.txt`。
- 1440 下为 3 Canvas/8 video；768 和 390 仍为 3 Canvas，但只有 3 video，且部分 Canvas 内部分辨率与 CSS 尺寸不相等；见 `RECON/original/original-recon.json`。

JUHAO 规则：

- 组件布局按容器/宽度设计，媒体策略再结合 `orientation`、pointer、hover、save-data 和 reduced-motion。
- 1440、768、390 是强制验收档，不是仅有的断点。
- Canvas backing size 与 CSS size 分开；resize 后重算 cover、camera aspect、texture resolution 和热点坐标。
- 热点坐标以归一化百分比保存，不能写死桌面 px；移动端若热点拥挤，转为可读列表而不是缩小点击区。
- 桌面 hover 必须有 focus/click 等价；移动菜单与 Dialog 的触控目标不小于项目设计 token 规定值。

## 9. 性能与稳定性

### 9.1 已观察问题

- **SOURCE**：1440 控制台出现 WebGL `GPU stall due to ReadPixels` warning；见 `RECON/original/original-recon.json`。
- **SOURCE**：CNZZ 通过跨站 `document.write` 注入 parser-blocking 脚本，三档均有浏览器 warning。
- **SOURCE**：Three.js、TweenMax、Anime、Swiper、JSMpeg 同页加载；首页共 21 个脚本、257 个请求。
- **SOURCE**：Three renderer 直接使用 `window.devicePixelRatio`，未见上限。
- **PARTIAL**：现有证据没有完整 Performance trace、长任务统计、显存曲线或 Lighthouse，因此不能声称具体 FPS/LCP 数值。

### 9.2 JUHAO 性能闸门

- 不接入 CNZZ、原站统计 id、原站 cookie 或追踪请求。任何新分析工具需独立审批和隐私披露。
- 动效只使用 GSAP + CSS；不并存 TweenMax、Anime 两套时间线。
- Three.js 动态加载；一个可见复杂区域最多一个主 RAF，后台/不可见时暂停。
- DPR 有上限，纹理按视口供应；不把桌面原图直接下发到 390px。
- video 使用 poster、metadata preload 与 IntersectionObserver；不可见即暂停。
- 只动画 transform、opacity、clip；滚动回调不做反复 DOM 测量。
- 每个页面用 GSAP context 清理；ScrollTrigger、observer、timer、RAF、video、WebGL 都有成对 teardown。
- build 后检查首屏 JS、图片、媒体和字体预算；数值预算由 JUHAO 素材确定后写入 CI，当前不凭空指定。

## 10. 网络与数据边界

原站只读查询证据：

| 原站请求 | 用途 | JUHAO adapter |
|---|---|---|
| `POST /brand` | 产品弹窗 | `ProductRepository.getById(id)` |
| `POST /service` + `get_city` | 省 → 市 | `LocationRepository.listCities(provinceId)` |
| `POST /service` + `get_shop` | 市 → 门店 | `LocationRepository.listLocations(cityId)` |
| `POST /investment` + `get_agent` | 省 → 招商联系人 | `PartnerRepository.listContacts(regionId)` |

响应字段和样本数量只在 `RECON/API_EVIDENCE.md` 留作 schema 证据。公开工程约束：

- 不请求原站接口，不缓存或发布原站响应。
- Mock 和未来 CMS 统一返回类型化 JSON；禁止 `eval`。
- Adapter 处理取消、超时和 schema 校验；组件只处理 loading/empty/error/ready。
- SEO 正文由服务器内容层输出，不能等待客户端 Ajax 才出现。
- 搜索使用 GET query，但查询词必须编码；结果不得拼入危险 HTML。

## 11. 无 source map 时的拆解纪律

`RECON/original/sourcemaps/VALIDATION.md` 已确认没有有效公开 source map。后续不得假装拥有源工程，也不得把压缩 bundle 中的变量名当成业务领域设计。

允许：

- 用 bundle 验证状态、参数、资源时序和算法形状；
- 通过浏览器关键帧、网络、DOM 和 Canvas 尺寸做黑盒对照；
- 在 JUHAO 工程中 clean-room 重写小而清晰的组件。

禁止：

- 直接复制原 bundle、shader 文本、HTML 大段结构或上传素材；
- 把未触发的分支当作已验证事实；
- 为匹配单张截图加入无法解释的 magic number；
- 把数据库、CMS 表结构或原站错误处理方式描述成 SOURCE。

## 12. 未证明事项

以下继续标为 **PARTIAL / GUESS**，专项验证前不得写入完成结论：

1. 每个内页的完整 z-index、computed style 与逐帧时间线。
2. PC 二级导航所有父子 hover 路径和精确延迟；现有通用探针缺少 hover 保持前置。
3. Canvas drag 引起变化的直接因果；可能包含滚动、计时器或 hover 叠加。
4. fragment shader 的真实 GPU 帧耗时、色彩空间差异和低端设备表现。
5. 招商两个 Canvas 时钟的所有节点相位与可见区暂停策略。
6. 所有 Ajax 的错误码、空数据、并发、缓存、限流和完整 schema。
7. 原站 CMS/数据库结构。
8. JUHAO 的真实产品、网点、招商、招聘、ESG、下载、法律与隐私内容。
9. 原站素材和字体的再发布授权；默认按无授权处理。

## 13. 工程进入条件与验收

### Baseline 完成条件

- [ ] loader、圆形 Canvas、WebGL、视频切换、招商时间线各有独立最小演示和静态降级。
- [ ] WebGL 使用自制校准纹理通过 1440 / 768 / 390 的五关键帧对照。
- [ ] 每个 baseline 标明 SOURCE 参数、PARTIAL 差异和仍存在的 GUESS。
- [ ] 重复挂载/卸载 20 次后，Canvas、RAF、observer、ScrollTrigger 和媒体实例不增长。

### 页面完成条件

- [ ] SSR 关闭 JS 后仍有正确标题、H1、正文、导航、链接和表单语义。
- [ ] 导航、Carousel、Tab、Accordion、Dialog、查询器具备键盘与触屏等价。
- [ ] loading、empty、error、retry、reduced-motion、video/WebGL 失败均有可验证状态。
- [ ] 三档截图、关键帧、交互路径、console、网络和路由都纳入验收。
- [ ] 页面只使用 JUHAO 自有/授权内容；构建产物不含 `nvc-lighting.com.cn`、CNZZ id、原站接口和原站追踪。

### 完成判定

“页面存在”不等于“复刻完成”。某页面族只有同时通过路由、SSR 内容、主视觉层、关键交互、响应式、降级、清理和素材合规，才能从 PARTIAL 升级为完成。
