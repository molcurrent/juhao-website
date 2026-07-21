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

### 2026-07-15 页面视觉扩充

以下素材同样由 Codex 内置 `image_gen` 全新生成，未输入或编辑第三方图片；经人工检查后以 ImageMagick WebP quality 82、移除元数据导入预览工程。

| 文件 | 用途 | 最终 SHA-256 |
|---|---|---|
| `public/images/jh-night.webp` | 首页夜间住宅场景 | `e1ef459479403f3a13b60be70b0f251dc8c1c9eab8e2f8d9821e4439941081e3` |
| `public/images/jh-hotel.webp` | 酒店照明与首页场景 | `d4c4755a9dc26f4e0b3c231e8e73c32ec3b41ebc59b7387bb5b4cbf8021c939b` |
| `public/images/jh-promenade.webp` | 公共步道与首页场景 | `4e199142d1536a2f2e2b1b2ee1d72998f1e9dc71ec05d43d84696c1f3f190c61` |
| `public/images/jh-smart.webp` | 智能家居夜间场景 | `905a9fbe15ea10aa37148afbda3805ced38e5be3ab4f53a957a62124f085cc1d` |
| `public/images/jh-brand.webp` | 品牌与材料展陈 | `e2d2c7d01ef1119afdfcbd264e4e1c678e55b0c3475b302fd25d1ebfbf2474f6` |
| `public/images/jh-products.webp` | 产品中心与资料下载 | `3e878923981f0e21778fe347346edf54e57e3ab9249efb64f39bc84d32074a64` |
| `public/images/jh-solutions.webp` | 照明方案中庭场景 | `da8cbbf7ab2e4328d3c6045fd494cc559c7073f0f88e17b7bc5d949e282cf269` |
| `public/images/jh-news.webp` | 新闻与展览活动场景 | `889469692b23c98eab642be03a7d38bfa9dec4d004dc03bf6b3648def13d0beb` |
| `public/images/jh-service.webp` | 服务支持工作台 | `16517f5abe63efa9c32dc914303da4095e3b638ac5489a1d5ba16f3be5ae069d` |
| `public/images/jh-partners.webp` | 合作展厅与协作场景 | `f504eb904bca961f8e7e3281b85c6e64b6c50415da877884e80eb0096d6c713f` |
| `public/images/jh-sustain.webp` | 可持续自然采光空间 | `5b3076f175c225df8aa6697af1403f01074d5da7e00c26bf0f3ccc34d300aead` |
| `public/images/jh-contact.webp` | 方案咨询空间 | `0c368577f6518c2465d637a68e7fc39e330f53f3929688a5dd502192b8b6a375` |
| `public/images/jh-spotlight-wall.webp` | 住宅墙面重点照明应用示意 | `fc96ce395150b63e9d55680c0b8d0c52bce822ce161da76d8adc63cdca52f7d7` |
| `public/images/jh-spotlight-dining.webp` | 餐桌重点照明应用示意 | `9190a2e1cef4935fb45c4c4d8f1fb9d2d79a701469544300dbedd15727d4edc4` |
| `public/images/jh-spotlight-retail.webp` | 零售陈列重点照明应用示意 | `6f0d233b50fd793895a403f402d3b18e392056317c96001a6daa00b7b4f7bf49` |
| `public/images/jh-scene-residential.webp` | 全屋照明专题资源视觉图 | `79429f46b7f972b91a3f439a8f910342dcce3e856462399b90746db8b7d31f30` |
| `public/images/jh-scene-hospitality.webp` | 酒店照明专题资源视觉图 | `209524596b14c74a41872bd7f3e26ba194a98f7f81c09af50b083c92dee05b95` |
| `public/images/jh-scene-commercial.webp` | 商业照明专题资源视觉图 | `ed7bbdcf8fbd5945627439a086b57fd7704300f1bdd4c4687f89d5c5241237fc` |
| `public/images/jh-scene-public.webp` | 公共照明专题资源视觉图 | `c9cb2daebd1c01ab41fd9790ab45a3b2c03b59302121b3b2a54f727f22e0a0f6` |
| `public/images/jh-scene-industrial.webp` | 工业照明专题资源视觉图 | `b5717c9d602bb9a37163d9a1b296b1f676329df304f01b6e747e5c7702cdbcac` |

## 最终提示词摘要

1. **首页 Hero**：蓝调时刻的原创现代住宅，左侧为深色文案留白，右侧为暖琥珀建筑照明；无人物、品牌、文字与水印。
2. **全屋 / 健康光**：傍晚家庭客厅，间接光、阅读光与低位光形成舒适层次；无品牌家具、文字与水印。
3. **商业**：原创精品零售空间，重点光呈现材质与动线，左侧留白；无品牌商品、标牌、文字与水印。
4. **公共**：原创公共图书馆中庭，阅读、台阶和导向照明清晰，左侧留白；无机构标识、可识别人脸、文字与水印。
5. **工业**：原创精密制造空间，均匀高棚光与安全通道，左侧纯深色墙面；强制零文字、零字母、零数字、零标牌、零水印。
6. **射灯应用**：住宅墙面、餐桌和精品零售三个独立场景，突出真实光斑、材质与视觉任务；不出现具体产品、品牌、文字或人物。
7. **方案资源**：住宅、酒店、商业、公共和工业五类原创空间，分别使用阅读角、酒店休息廊、材料展厅、公共中庭和洁净检测通道，作为专题资源视觉而非项目证据。

工业图第一版因模型生成了英文大字而被拒绝，未进入工程；表内文件均为人工检查后的最终版本。

### 2026-07-16 原创场景去重批次（48 张）

本批次由 Codex 内置 `image_gen` 按单一落位逐张生成，未输入或编辑第三方图片；ImageMagick WebP quality 82、移除元数据。所有图片仅作为品牌、栏目、方案和知识内容的场景视觉，不作为具体产品、项目实施或完工证据。

| 文件 | 用途 | 最终 SHA-256 |
|---|---|---|
| `public/images/jh48-product-card-spotlights.webp` | 射灯专题入口场景 | `093a0c37e28fa5dc63429201eaaf8198c4f628f51ced44c8832a1d648d9a1564` |
| `public/images/jh48-product-hero-spotlights.webp` | 射灯专题首屏场景 | `c58305008a8070b005633d4c06283e4a9824533f45641d70fc45ee8782910b58` |
| `public/images/jh48-product-card-ceiling.webp` | 顶灯专题入口场景 | `84dccc43a17ed64a5803e5f0f4fa73c268b5cf0a5d693cbb9dc02d83c01147db` |
| `public/images/jh48-product-hero-ceiling.webp` | 顶灯专题首屏场景 | `7e389f908298650b3cf1c3cf6717e9a820cbac2ffe2c304785f0e7f8c285b141` |
| `public/images/jh48-product-card-new-chinese.webp` | 新中式专题入口场景 | `81c92c5ba90423103724f536ec4313ca56e7cd854de7a87a8715cbdb106c4c19` |
| `public/images/jh48-product-hero-new-chinese.webp` | 新中式专题首屏场景 | `f488b8ad3ff5a6ae737aad3cf1475ca76757071288294340f318afcc26162dbc` |
| `public/images/jh48-product-card-art.webp` | 艺术灯专题入口场景 | `08ed5057cf0587a0e0d7910cef2faf23d643aa6eee665d26e4907d23fcbf03ff` |
| `public/images/jh48-product-hero-art.webp` | 艺术灯专题首屏场景 | `c0f2486892fdea08210f211282a1eddd0788140cc2bfd4a3b85a00b5de77f42e` |
| `public/images/jh48-product-card-crystal.webp` | 水晶灯专题入口场景 | `4a9904ec7709eab0a1e8896651b3eabfdd28a2595a918e23cafcb038e6bb49a4` |
| `public/images/jh48-product-hero-crystal.webp` | 水晶灯专题首屏场景 | `62ae5f93ea5273fb8e03008beadaa7b67c8891b06f7980f268faf5253a258d64` |
| `public/images/jh48-product-card-linear.webp` | 线性照明专题入口场景 | `5cf547bc51b98757c8d0d8a4dec55c4524df51b55247475e975214c99ad941a1` |
| `public/images/jh48-product-card-switches.webp` | 开关专题入口场景 | `50491b3922fbc8810ec553b5ad62a918d50f1bcd0a87492cb37b78d385b0488e` |
| `public/images/jh48-product-hero-switches.webp` | 开关专题首屏场景 | `ce2c0cd35a3ad30d482149c2101f1afc983d5d4df4cf251574feeff0adb8d151` |
| `public/images/jh48-product-card-outdoor.webp` | 户外照明专题入口场景 | `84d378e3ec9dbe7a9ab543d75431ad2e6365a09b4e5550db498f17f3223fc87c` |
| `public/images/jh48-product-hero-outdoor.webp` | 户外照明专题首屏场景 | `59ecdee814264523c86724823d4a0d0d6280020663e7a0feb4d00b96a76be1cf` |
| `public/images/jh48-product-card-project-custom.webp` | 工程定制专题入口场景 | `940663406842415c873c25c86115ed1333c61d243f78f659a452a1821ff7cf58` |
| `public/images/jh48-product-hero-project-custom.webp` | 工程定制专题首屏场景 | `f51569ab7180751994ad1bf19479ed3c150a97bc9cc05528010dd08281ac3def` |
| `public/images/jh48-product-card-smart-devices.webp` | 智能设备专题入口场景 | `e33f50f5c1a3ef1dd7b615f29eb568c71bfb39ef2a6776a11e5a786c428cfc71` |
| `public/images/jh48-product-hero-smart-devices.webp` | 智能设备专题首屏场景 | `1fb80f03e3bcb9c83f75230a9b715a0223950ea4068721b489668149e7a30609` |
| `public/images/jh48-solution-card-residential.webp` | 全屋照明方案入口场景 | `7251afb131d2696d8536371af94f4aac33bc0d40e53ea70368f808a611c11d91` |
| `public/images/jh48-solution-card-hospitality.webp` | 酒店照明方案入口场景 | `4a134b0991a4811c9a042ec16f9fa2127394c2bb30dd5535e513a683ae5b5832` |
| `public/images/jh48-solution-card-commercial.webp` | 商业照明方案入口场景 | `a4b5d7dfa516dbadec333d20f99fdd6b4f89fa6d0bfda5b79480121ed34561bc` |
| `public/images/jh48-solution-card-public.webp` | 公共照明方案入口场景 | `03c54c1c85cc50ffaff7818343b122843d81311df53b84e0f8172633b7d3a655` |
| `public/images/jh48-solution-card-industrial.webp` | 工业照明方案入口场景 | `f6735e9dca56e3bea4dbb7c97ac670b05b007f3a0f940790e4ac2b31ceca88cf` |
| `public/images/jh48-about-story-human.webp` | 品牌人本叙事场景 | `78cd616b1fd563b5a934884aaf91ab96e359b83b31c3d6db5e6bc3e67048f0c2` |
| `public/images/jh48-about-story-context.webp` | 品牌空间叙事场景 | `bea4b60fe752b07f97a00080365b77c22322d4f4b17093c387b323f8948994d6` |
| `public/images/jh48-about-story-lasting.webp` | 品牌长期使用叙事场景 | `84bc951928b3a15b452ca9cab949961f6aa7374931185f07e107f2ad315da6ae` |
| `public/images/jh48-history-archive.webp` | 发展历程档案场景 | `0965f4c3e50279576933ebeeaf807898e36747939976fd204fc43653aff260d5` |
| `public/images/jh48-careers-studio.webp` | 人才协作场景 | `e7e16969b2e9b99f845a9ff32c3ced3db30f46085b7aa599712995a4195e2acb` |
| `public/images/jh48-news-light-fair.webp` | 光亚展资讯主题场景 | `fb33ce661bc531696c478b11fe7289295a208f4da0fed6c57555640b2b7003ac` |
| `public/images/jh48-news-brand-award.webp` | 品牌荣誉资讯主题场景 | `edcddb0607c8a7f9f45b29e690b6d98357aa978c046ccde38a185ee4466500ca` |
| `public/images/jh48-news-home-brand.webp` | 家居品牌资讯主题场景 | `c01f95325caff2ad178d5b07b9767641950645d50feee491b61c45fed8d7780a` |
| `public/images/jh48-news-dealer.webp` | 经销商资讯主题场景 | `e07059713df0c9e3f64d171d5ef71f37e6aff9cc777d9bd3976551d69dfe0d39` |
| `public/images/jh48-news-yichang-hotel.webp` | 宜昌酒店资讯主题场景 | `782beb7a0a3053afd64681455aa730fac92d2edea2a1323f5f8a3429218ff6ee` |
| `public/images/jh48-news-kunming-hotel.webp` | 昆明酒店资讯主题场景 | `3cf1c9523b9be9612109abd7444e2b108655ecaa7543d91ad1519caa30c95675` |
| `public/images/jh48-news-dalian-hotel.webp` | 大连酒店资讯主题场景 | `e41ac1ac8ea2e1bb3b71c59f00fab743cf5c853d06f2e95af2b5b5891108abe4` |
| `public/images/jh48-news-nanyan-resort.webp` | 南雁度假酒店资讯主题场景 | `99c5818b67fdd0b33f5f7f9838556cc370d9b9eb2e7c417fb2e9372398b7f74c` |
| `public/images/jh48-news-page2-hero.webp` | 资讯第二页档案首屏 | `2bc4cdad0d591407daf78ce831ddc1f6242e7b06bdcd40b5053760931997acfa` |
| `public/images/jh48-healthy-hero.webp` | 健康光栏目首屏场景 | `ca031661baeea9ac1d91e8168587213956541771d023c7520696dd6de96a7020` |
| `public/images/jh48-smart-scene-home.webp` | 智能家居联动场景 | `96f6903d4e1476bd25e327b54d7097a6a9789f8076dc76f64b92bf008b44bb5f` |
| `public/images/jh48-mall-hero.webp` | 商城栏目首屏场景 | `91fdb271d8621c0c1e161b1cd11d6e9dbeb190abe8a5567805304587e3a75275` |
| `public/images/jh48-home-hero-promenade.webp` | 首页滨水光带场景 | `65af880e4f83b3cb40d25c2f3e74e7d6d4a3e7378f4a346e2a89819792d7a893` |
| `public/images/jh48-home-hero-material.webp` | 首页材料与光束场景 | `59705a061ea710020d04cb5aea7317c601acfa998ad2c80aac52487c24c6121f` |
| `public/images/jh48-home-scene-residential.webp` | 首页全屋方案场景 | `a369a3b24c205de275077fa385de60d4b6dba614c342fbf6a7b081a702e7d491` |
| `public/images/jh48-home-scene-hospitality.webp` | 首页酒店方案场景 | `e3a34dfbe251f657af10d532502cfd46d27b746555afffa7885bdca3a62c6035` |
| `public/images/jh48-home-scene-commercial.webp` | 首页商业方案场景 | `7654edbae5d3bd3c048d877b5bf84698d019e970ca322cdc73127ea0039d4f92` |
| `public/images/jh48-home-scene-public.webp` | 首页公共方案场景 | `f30c5b925a2c0e3740214cb5cec355f7884189380e6cf87840fa763827f28b53` |
| `public/images/jh48-home-scene-industrial.webp` | 首页工业方案场景 | `1c1647e37aa83e80a6d5d96c36ade5b0e65280ffbe3d674369264f1e2c3a381b` |

提示词分为产品专题、五类方案、品牌档案、企业资讯、健康光与智能家居、首页电影化场景六组；统一要求 16:9、建筑照明编辑摄影、无人物、无文字、无标志、无水印，并明确“概念场景，不作为真实产品或项目证据”。

## 校验

- 旧版 `hero.jpg`、`home.jpg`、`business.jpg`、`public.jpg`、`industrial.jpg` 已确认逐一命中 NVC 镜像哈希并从 `public/` 删除。
- 当前 5 张 WebP 与本地 NVC 镜像 / 实时取证素材哈希匹配数为 0。
- 发布前仍需对 `public/` 全量执行哈希与原站域名残留扫描。
