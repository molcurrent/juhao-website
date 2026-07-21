# 产品目录 V2 P0 + P1 + P2 质量报告

- 来源快照：2026-07-16
- 来源商品：1920（SQL 商品与本地补充使用复合主键）
- 网页目录候选：1913，另有 7 条非照明商品仅保留治理去向
- 自动派生产品族：1208，其中强证据合并 185 组
- 人工复核行：353
- 私有样板：120 个产品族，覆盖 24 个分类
- 当前批次待完成人工关系复核：0 条；待处理分类异常：0 条
- 当前批次媒体路径：1131 条，其中 1007 条没有公开授权批次证据
- 私有运行时仅输出 124 条已授权媒体路径；其余路径保留在治理清单，不进入图片代理白名单。
- 本地人工审核工作台：49 项；已授权首图候选：22 个产品族，其中原样展示媒体全授权 1 个
- 当前批次保持 private_noindex；不进 sitemap，不激活旧路由别名，也不视为公开发布。
- 旧产品 URL 预留映射：31 条，当前未激活跳转
- 中性产品系列公开路径账本：1208 条，其中新增中性路径 1186 条；公共投影为 noindex 草稿且不输出任何源图片。
- 轻量索引：322603 bytes（预算 512000 bytes）
- `undefined-*` 规格行派生层归一为空值：15593
- “体戏”表头派生层归一为“体积”：1737 篇
- SQL、Obsidian 商品页和 IoT 原始资料均未修改。
- IoT 产品配置、用户、地址、订单、支付、设备实例、日志、验证码与密钥字段未进入运行时样板。

## 验收

- 通过：source_count_is_1920
- 通过：compound_keys_unique
- 通过：sample_count_is_120
- 通过：all_eligible_categories_covered
- 通过：non_lighting_records_have_explicit_disposition
- 通过：all_31_existing_routes_reserved
- 通过：canonical_route_contract_is_topic_source_id
- 通过：index_within_500kb
- 通过：iot_boundary_clean
- 通过：runtime_media_authorized_only
- 通过：active_batch_runtime_family_set_is_exact
- 通过：decision_application_conserves_sources
- 通过：active_release_controls_safe
- 通过：blocked_batch_not_misreported_as_public
- 通过：full_release_not_misreported_as_public
- 通过：neutral_public_route_contract_covers_all_families
- 通过：public_runtime_suppresses_all_source_media
- 通过：active_batch_media_scope_is_exact
- 通过：review_workbench_matches_active_blockers
