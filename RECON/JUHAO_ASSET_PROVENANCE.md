# JUHAO 公开视觉素材与品牌 VI 溯源

- 生成日期：2026-07-12
- 生成方式：Codex 内置 `image_gen`，全新生成，未输入或编辑 NVC 图片。
- 网页转换：ImageMagick 7.1.2，WebP quality 84，移除元数据。
- 公共边界：这些文件用于 JUHAO 预览工程；原站图片仅保留在被 git 忽略的 `RECON/` 取证区。

## 品牌 VI 证据

- 原始文件：`20220531终端建设推广手册(最终印刷版)转曲.pdf`（只作外部审计源，PDF 本体不复制进仓库或 `public/`）。
- PDF 标题：`钜豪VIS手册印刷转曲6.2`；共 54 页；文件大小 30,451,583 bytes。
- PDF SHA-256：`a8801f9f5ee201db38319f5454d7e7e78a83a712f93de105781e20375d992ec2`。
- 第 5 页：标准竖式品牌标志与最小使用示例；第 6 页：竖式标志网格与反白规范；第 7 页：横式及中英文组合标志网格；第 8 页：组合方式、错误使用与背景适配；第 9 页：标准色与辅助印刷色。
- 标准橙：`PANTONE 1505 CVC / CMYK C0 M80 Y100 K0`。网页 `--vi-orange: #e05717` 是屏幕适配值，不反向声明为手册中的 RGB/HEX 标准。
- 使用门禁：标志不得拉伸、倾斜、重排、描边或擅自换色；深色背景使用反白版，浅色背景使用标准橙版。

| 品牌文件 | VI 用途 | 最终 SHA-256 |
|---|---|---|
| `public/brand/juhao-logo-horizontal.svg` | 横式标准橙标志 | `12e6512af97e35207a1473a7008b840a8b17be5cde341e601ddfb855d8c548d3` |
| `public/brand/juhao-logo-horizontal-white.svg` | 横式反白标志 | `b1f5ccbf62c36f93f9166754250c25394611d9689011873b028a1b0b2ec42937` |
| `public/brand/juhao-logo-stacked.svg` | 竖式标准橙标志 | `c7c230e226b69a6b2514a590de54681ec2f6b8f802e20440095761c1360b8566` |
| `public/brand/juhao-logo-stacked-white.svg` | 竖式反白标志 | `c877c720a56988f4f55813dce79abf6005f5abbedd01ae2eba7da76bd1598136` |
| `public/favicon.png` | 站点图标 | `9c99ec4c387ab601d02cb0bfb7dadb2cac4dd7a24725c62b3b80a881beb190f3` |

逐路由社交分享图由 `scripts/generate_route_og.mjs` 根据发布台账确定性生成，采用标准橙、石墨黑、反白标志和项目阶段标签。逐文件路径、大小与哈希记录在 `content/governance/route-og.json`；生成图固定为 1200×630 JPEG 且单张低于 300KB。

| 文件 | 用途 | 最终 SHA-256 |
|---|---|---|
| `public/images/juhao-hero.webp` | 首页 Hero | `8887e67c4225d2f2c6111962ec94ec709120b0585752fedb8d6ff3a5d6d93cbf` |
| `public/images/juhao-home.webp` | 全屋 / 健康光 | `61b7d810904d6bd25fa6706b899c44f24ddaff3e277d262427062a3915983319` |
| `public/images/juhao-commercial.webp` | 商业 / 合作 | `935549cc919aa16798ef63356f4b1b7e7ff94b2ffa8fc8a3533172368c1d6c02` |
| `public/images/juhao-public.webp` | 公共 / 服务 / ESG | `96a3f0cc5b90737258fba1ce3abb74ed1bcb01e88ce88a64ea047b185a0b8bad` |
| `public/images/juhao-industrial.webp` | 工业 / 下载 / 法律页 | `9550826fac21e36969e4293eebddbb1b72ec5fc646740de455cd3bfc309af158` |

## 最终提示词摘要

1. **首页 Hero**：蓝调时刻的原创现代住宅，左侧为深色文案留白，右侧为暖琥珀建筑照明；无人物、品牌、文字与水印。
2. **全屋 / 健康光**：傍晚家庭客厅，间接光、阅读光与低位光形成舒适层次；无品牌家具、文字与水印。
3. **商业**：原创精品零售空间，重点光呈现材质与动线，左侧留白；无品牌商品、标牌、文字与水印。
4. **公共**：原创公共图书馆中庭，阅读、台阶和导向照明清晰，左侧留白；无机构标识、可识别人脸、文字与水印。
5. **工业**：原创精密制造空间，均匀高棚光与安全通道，左侧纯深色墙面；强制零文字、零字母、零数字、零标牌、零水印。

工业图第一版因模型生成了英文大字而被拒绝，未进入工程；表内文件均为人工检查后的最终版本。

## 校验

- 旧版 `hero.jpg`、`home.jpg`、`business.jpg`、`public.jpg`、`industrial.jpg` 已确认逐一命中 NVC 镜像哈希并从 `public/` 删除。
- 当前 5 张 WebP 与本地 NVC 镜像 / 实时取证素材哈希匹配数为 0。
- 发布前仍需对 `public/` 全量执行哈希与原站域名残留扫描。
