# Design System

## Direction

钜豪的视觉方向是“被橙色光束切开的建筑空间”。深石墨负责空间深度，银灰与白色负责资料阅读，橙色只承担光、进度和行动。首页三个核心场景接近整屏导演，其余内容保持清晰的正常文档流。

## Color

- Brand orange: `#e05717`
- Dark orange: `#bc4311`
- Graphite: `#1e1916`
- Paper: `#f3f3f2`
- Raised surface: `#ffffff`
- Body ink: `#625d58`
- Divider: `#d5d1ce`

正文与背景至少满足 4.5:1，对大字号和装饰性文字不使用低对比灰色。橙色不作为长段正文颜色。

## Typography

沿用现有 Nexa、苹方、微软雅黑回退栈。全站字号只使用眉题、小字、正文、引导语、三级标题、二级标题、展示标题七种语义角色，对应 `--type-*` Token。展示标题使用紧凑粗体，正文保持 16px 以上、1.7–1.9 行高和 65–72ch 的阅读宽度。标题使用 `text-wrap: balance`，正文使用 `text-wrap: pretty`。

## Layout

- 页面水平留白使用 `--page-gutter`，内容最大宽度 1600px。
- 核心首页场景使用 `100svh` 附近的舞台；移动端以内容高度为主，不强制滚动。
- 内容页只使用图片型、分栏型、文档型、工作台型四种 Hero。各自使用统一最小高度 Token；移动端恢复为内容高度。
- 普通章节使用 `--section-space` 或 `--section-space-compact`，锚点统一避开固定导航。
- 文章正文使用 `--reading-measure`，不让新闻、知识与通用文章各自定义阅读宽度。
- 产品、项目和文章通过共享模板保持一致，但不把所有内容压成同尺寸卡片网格。
- 编号只表达流程、排序、来源编号或真实序列，不把 `00 / 01 / 02` 用作分类装饰。
- 响应式验收宽度为 320、390、768、1024、1440px。

## Motion

- Fast feedback: 220ms
- Content entrance: 620ms
- Section transition: 1000ms
- Ambient motion: 10s
- Eases: `power4.out`, `power3.inOut`, `none`

GSAP 只用于时间线、滚动场景和复杂媒体切换；按钮、菜单与简单状态继续使用 CSS。动画只操作 transform、opacity、clip-path和受控 CSS 变量。减少动态效果时取消自动播放、固定滚动、位移和光标跟随。

## Components

- Header: 根据当前章节的 `data-header-tone` 切换深浅主题；桌面使用全宽导航面板，移动端使用手风琴抽屉。
- Hero: 首页保留原生 WebGL 位移画布；内容页使用图片、分栏、文档和工作台四种明确变体。
- Scene stage: 桌面 sticky 舞台配语义化滚动步骤；移动端原生横向 scroll-snap。
- Evidence content: 已确认、阶段和待补充状态必须保留原文，不以动效隐藏。
- Catalog Lab: 保持私有和 `noindex`，搜索、筛选、结果数量与审核状态优先于装饰媒体；审核决策栏固定在可达位置并明确浏览器草稿状态。
- Footer: 桌面展开，移动端折叠；品牌声明不得挤压导航或形成超大堆叠文字。
