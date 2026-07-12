# 原站接口证据与 Mock 映射

取证时间：2026-07-12。以下请求均是原站访客页面自身发起的只读查询型 POST；只记录参数与响应结构，不把原站数据带入公开版本。

## SOURCE：业务产品弹窗

- 请求：`POST /brand`
- 参数：`get_products_home=1`、`products_id=<id>`
- 样本：`products_id=2`
- 响应：object
- 顶层字段：`ktitle`、`ktitle_en`、`kvideo`、`listimg`、`related_products`
- `related_products` 样本数量：3
- 关联项字段：`kimg`、`ktitle`、`products_id`
- 目标 Mock：`ProductDetail` + `ProductSummary[]`

## SOURCE：省份到城市

- 请求：`POST /service`
- 参数：`get_city=1`、`province=<省份名称>`
- 样本：`province=广东省`
- 响应：string[]
- 样本城市数量：21
- 目标 Mock：`RegionProvince.cities: string[]`

## SOURCE：城市到服务门店

- 请求：`POST /service`
- 参数：`get_shop=1`、`city=<城市名称>`
- 样本：`city=东莞市`
- 响应：array，样本数量 14
- 条目字段：`ktitle`、`address`
- 目标 Mock：`ServiceLocation { id, name, address, city }`

## SOURCE：省份到招商联系人

- 请求：`POST /investment`
- 参数：`get_agent=1`、`province=<区域编码-省份名称>`
- 样本：`province=1011008-广东省`
- 响应：array，样本数量 1
- 条目字段：`name`、`province`、`tel`
- 目标 Mock：`RegionalPartnerContact { id, region, displayName, contactChannel }`

## 新工程约束

- 页面不得直接调用原站接口。
- API adapter 统一返回类型化 JSON，禁止延续 `eval("(" + res + ")")`。
- 初版使用钜豪自有 Mock；以后接入目标 CMS/API 时只替换 adapter。
- 加载、空数据、错误和重试状态必须在组件层可验证。
- 原站联系人、门店、产品标题、图片与视频不进入正式发布包。
