# JUHAO 公开视觉素材溯源

- 生成日期：2026-07-12
- 生成方式：Codex 内置 `image_gen`，全新生成，未输入或编辑 NVC 图片。
- 网页转换：ImageMagick 7.1.2，WebP quality 84，移除元数据。
- 公共边界：这些文件用于 JUHAO 预览工程；原站图片仅保留在被 git 忽略的 `RECON/` 取证区。

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
