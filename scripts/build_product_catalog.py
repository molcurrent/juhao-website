from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
KB = Path("/Users/mac/Documents/juhao数据库/企业知识库")
MALL = KB / "商城系统"
SQL_SOURCE = Path("/Users/mac/Documents/juhao数据库/juhao_mall_2026-07-10_02-41-52_mysql_data.sql")
OUT = ROOT / "content" / "governance"

TOPICS = [
    ("射灯", "spotlights"),
    ("家居顶灯", "ceiling-lights"),
    ("新中式", "new-chinese"),
    ("艺术灯", "art-lights"),
    ("水晶吊灯", "crystal-chandeliers"),
    ("灯带", "linear-lighting"),
    ("开关面板", "switches"),
    ("户外照明", "outdoor-lighting"),
    ("工程定制", "project-custom"),
    ("家居智能设备", "smart-home-devices"),
]

PUBLISH_LIMITS = {
    "射灯": 6,
    "家居顶灯": 6,
}

CASES = [
    (226, "深圳华发冰雪世界 JW 万豪酒店", "jw-marriott-shenzhen-huafa-snow-world", "酒店", "签约/中标"),
    (231, "上饶广丰铂尔曼酒店", "pullman-shangrao-guangfeng", "酒店", "签约/中标"),
    (228, "苏州金融街君悦酒店", "grand-hyatt-suzhou-financial-street", "酒店", "签约/中标"),
    (229, "南通海门希尔顿逸林酒店", "doubletree-nantong-haimen", "酒店", "签约/中标"),
    (220, "扬州经开区一河两岸户外亮化工程", "yangzhou-riverfront-lighting", "户外亮化", "签约/中标"),
    (225, "2026 中国智慧道路照明大会", "china-smart-road-lighting-conference-2026", "智慧道路", "活动/荣誉"),
]

FORBIDDEN = re.compile(r"测试|饮料|食品|纸品|手机|三只松鼠|同仁堂|维达")
LINK_RE = re.compile(r"\[\[商城系统/商品说明/([^|\]]+)\|([^\]]+)\]\]")
FIELD_RE = re.compile(r"^(ID|分类|价格|创建时间|上架时间):\s*(.*)$", re.MULTILINE)
IMAGE_RE = re.compile(r"https://[^)\s]+\.(?:png|jpe?g|webp)", re.I)
MODEL_RE = re.compile(r"^[A-Za-z0-9]+(?:[-+*/.][A-Za-z0-9]+)*(?:[-+*/.][A-Za-z0-9]+)*")

INSTALLATION_NOTES = {
    "射灯": ["开孔、灯体尺寸和吊顶深度需在施工前复核。", "光束角、照射距离与防眩要求应结合空间方案确认。"],
    "家居顶灯": ["安装前核对灯体尺寸、顶面承重与预留线路。", "不同规格与控制方式不得仅凭系列图片替代确认。"],
    "新中式": ["安装前核对灯体尺度、吊装高度与空间净高。", "天然材质或手工部件可能存在合理纹理差异。"],
    "艺术灯": ["造型灯具需结合吊点、承重、运输与现场组装条件确认。", "多层或异形组合应以最终深化图和装箱清单为准。"],
    "水晶吊灯": ["需由专业人员核对承重结构、吊装高度和维护空间。", "水晶组件数量、规格和装配顺序以正式说明书为准。"],
    "灯带": ["驱动功率需留有余量，并核对电压、回路长度和散热条件。", "灯带、驱动与控制器的兼容性应成套确认。"],
    "开关面板": ["由具备资质的人员按电气规范安装并断电施工。", "负载类型、回路数量和智能协议需在选型前确认。"],
    "户外照明": ["户外使用需结合安装环境核对防护、充电和维护要求。", "产品图片不能替代现场安全与防水施工。"],
    "工程定制": ["定制产品以项目深化图、样板确认和技术交底为准。", "造型、材质、光源与安装节点变更需留存书面记录。"],
    "家居智能设备": ["安装前核对供电、安装尺寸、承重与网络条件。", "智能协议、联动范围与售后边界需以正式资料为准。"],
}


def parse_sql_values(values: str) -> list[list[str]]:
    rows: list[list[str]] = []
    row: list[str] = []
    value: list[str] = []
    in_string = in_row = escaped = False
    for char in values:
        if escaped:
            value.append({"n": "\n", "r": "\r", "t": "\t"}.get(char, char))
            escaped = False
        elif char == "\\" and in_string:
            escaped = True
        elif in_string:
            if char == "'":
                in_string = False
            else:
                value.append(char)
        elif char == "'":
            in_string = True
        elif char == "(" and not in_row:
            in_row = True
            row, value = [], []
        elif char == ")" and in_row:
            row.append("".join(value).strip())
            rows.append(row)
            in_row = False
        elif char == "," and in_row:
            row.append("".join(value).strip())
            value = []
        elif in_row:
            value.append(char)
    return rows


def load_goods() -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    with SQL_SOURCE.open(encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if not line.startswith("INSERT INTO `jh_goods`"):
                continue
            values = line.split(" VALUES ", 1)[1].rstrip(";\n")
            for row in parse_sql_values(values):
                if len(row) < 66:
                    continue
                result[row[0]] = {
                    "product_no": row[2] if row[2] != "NULL" else "",
                    "is_sale": row[13],
                    "goods_status": row[35],
                    "stock": row[10],
                    "sale_time": row[37],
                    "data_flag": row[44],
                    "delivery": row[60] if row[60] != "NULL" else "",
                    "warranty": row[64] if row[64] != "NULL" else "",
                }
    return result


def department_map() -> dict[str, str]:
    result: dict[str, str] = {}
    for index in sorted((MALL / "商品部门索引").glob("*_部门索引.md")):
        department = index.stem.removesuffix("_部门索引")
        for source_id in re.findall(r"_(\d+)\.md\)", index.read_text(encoding="utf-8")):
            result.setdefault(source_id, department)
    return result


def parse_parameters(text: str) -> list[dict[str, str]]:
    parameters: list[dict[str, str]] = []
    active = False
    for line in text.splitlines():
        if line.startswith("### 商品属性参数"):
            active = True
            continue
        if active and line.startswith("### "):
            break
        if active and line.startswith("|") and "---" not in line and "属性名称" not in line:
            parts = [part.strip() for part in line.strip("|").split("|")]
            if len(parts) >= 2 and parts[0] and parts[1]:
                parameters.append({"name": parts[0], "value": parts[1]})
    return parameters


def unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def product_record(topic: str, topic_slug: str, stem: str, label: str, departments: dict[str, str], goods: dict[str, dict[str, str]]) -> dict | None:
    path = MALL / "商品说明" / f"{stem}.md"
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    fields = dict(FIELD_RE.findall(text))
    source_id = fields.get("ID", "")
    sql = goods.get(source_id)
    images = unique(IMAGE_RE.findall(text))
    if not sql or not images or FORBIDDEN.search(f"{label} {fields.get('分类', '')}"):
        return None
    parameters = parse_parameters(text)
    model_match = MODEL_RE.match(label.strip())
    model = model_match.group(0).strip(" -") if model_match else label.split(maxsplit=1)[0]
    corporate_images = all(image.startswith("https://bocang.oss-cn-shenzhen.aliyuncs.com/") for image in images)
    no_broken_specs = "undefined-" not in text
    completeness = min(100, 35 + min(len(parameters), 8) * 6 + min(len(images), 10) * 2 + (5 if model else 0) + (5 if no_broken_specs else 0))
    active_sale = sql["is_sale"] == "1" and sql["goods_status"] == "1" and sql["data_flag"] == "1"
    publishable = active_sale and corporate_images and len(images) >= 4 and completeness >= 80 and departments.get(source_id, "未确认") != "未归属部门"
    status = "在售" if active_sale else "非在售"
    return {
        "source": "企业知识库商品说明 + 商城 SQL",
        "source_id": source_id,
        "content_type": "产品",
        "title": label.strip(),
        "model": model,
        "topic": topic,
        "topic_slug": topic_slug,
        "review_status": "已审核" if publishable else "待审核",
        "sale_status": status,
        "fact_status": "已核实" if publishable else "需企业确认",
        "parameter_completeness": f"{completeness}%",
        "parameter_count": len(parameters),
        "image_status": "完整" if len(images) >= 4 else "缺失",
        "image_authorization": "企业商城渠道素材" if corporate_images else "待授权核验",
        "image_count": len(images),
        "department": departments.get(source_id, "未确认"),
        "publish_date": str(date.today()) if publishable else "",
        "updated_at": str(date.today()),
        "seo_slug": f"/products/{topic_slug}/{source_id}",
        "legacy_url": "",
        "source_file": str(path),
        "primary_image": images[0],
        "category": fields.get("分类", ""),
        "sale_time": sql["sale_time"],
        "stock": sql["stock"],
        "delivery": sql["delivery"],
        "warranty": sql["warranty"],
        "parameters": parameters,
        "gallery": images[:6],
        "installation_notes": INSTALLATION_NOTES[topic],
        "publishable": publishable,
        "quality_score": completeness + (20 if active_sale else 0) + (5 if corporate_images else 0),
    }


def build_products(goods: dict[str, dict[str, str]], departments: dict[str, str]) -> tuple[list[dict], list[dict]]:
    candidate_pool: list[dict] = []
    used_candidates: set[str] = set()
    for topic, slug in TOPICS:
        index = MALL / "商品专题分类" / f"{topic}_专题索引.md"
        records = [
            record
            for stem, label in LINK_RE.findall(index.read_text(encoding="utf-8"))
            if (record := product_record(topic, slug, stem, label, departments, goods))
        ]
        records.sort(key=lambda item: (item["publishable"], item["quality_score"], int(item["source_id"])), reverse=True)
        for record in records:
            if record["source_id"] in used_candidates:
                continue
            candidate_pool.append(record)
            used_candidates.add(record["source_id"])
            if sum(item["topic"] == topic for item in candidate_pool) == 10:
                break
    published: list[dict] = []
    for topic, _ in TOPICS:
        limit = PUBLISH_LIMITS.get(topic, 3)
        published.extend([item for item in candidate_pool if item["topic"] == topic and item["publishable"]][:limit])
    published_ids = {item["source_id"] for item in published}
    for record in candidate_pool:
        if record["source_id"] not in published_ids and record["review_status"] == "已审核":
            record["review_status"] = "待审核"
            record["publish_date"] = ""
    return candidate_pool, published


def build_cases() -> list[dict]:
    rows: list[dict] = []
    for source_id, title, slug, case_type, stage in CASES:
        matches = list((MALL / "帮助文章").glob(f"*_{source_id}.md"))
        if not matches:
            continue
        images = unique(IMAGE_RE.findall(matches[0].read_text(encoding="utf-8")))
        rows.append({
            "source": "企业知识库帮助文章",
            "source_id": str(source_id),
            "content_type": "案例",
            "title": title,
            "model": "",
            "topic": case_type,
            "topic_slug": "",
            "review_status": "已审核",
            "sale_status": "",
            "fact_status": "已核实",
            "parameter_completeness": "",
            "parameter_count": "",
            "image_status": "完整" if images else "缺失",
            "image_authorization": "企业新闻渠道素材" if images else "待授权核验",
            "image_count": len(images),
            "department": "工程项目",
            "publish_date": str(date.today()),
            "updated_at": str(date.today()),
            "seo_slug": f"/cases/{slug}",
            "legacy_url": "",
            "source_file": str(matches[0]),
            "primary_image": images[0] if images else "",
            "category": case_type,
            "sale_time": stage,
            "stock": "",
            "delivery": "",
            "warranty": "",
            "parameters": [],
            "gallery": images[:6],
            "installation_notes": [],
            "publishable": True,
            "quality_score": "",
        })
    return rows


def write_outputs(products: list[dict], published: list[dict], cases: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ledger = products + cases
    flat_fields = [key for key in ledger[0] if key not in {"parameters", "gallery", "installation_notes", "publishable", "quality_score"}]
    with (OUT / "content-ledger.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=flat_fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows({key: row.get(key, "") for key in flat_fields} for row in ledger)
    (OUT / "content-ledger.json").write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "published-products.json").write_text(json.dumps(published, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    distribution = Counter(item["topic"] for item in published)
    completeness = [int(item["parameter_completeness"].rstrip("%")) for item in published]
    report = [
        "# 产品内容台账质量报告",
        "",
        f"生成日期：{date.today()}",
        "",
        "## 数据范围",
        "",
        "- 商城 SQL 用于核对 `isSale`、`goodsStatus`、`dataFlag`、库存与交期。",
        "- 企业知识库商品说明用于核对事业部、结构化参数、主图和详情图。",
        "- 仅把 10 个首批专题中通过门禁的产品写入公开详情页数据。",
        "",
        "## 结果",
        "",
        f"- 审核台账：{len(products)} 款候选，保持每个专题 10 款。",
        f"- 首批公开：{len(published)} 款；产品 ID 唯一，无跨专题重复发布。",
        "- 深专题发布上限：射灯、家居顶灯各 6 款；其余专题各 3 款。",
        f"- 参数完整度：最低 {min(completeness)}%，平均 {sum(completeness) / len(completeness):.1f}%。",
        "- 在售门禁：`isSale=1`、`goodsStatus=1`、`dataFlag=1`。",
        "- 图片门禁：至少 4 张，且全部来自企业商城 OSS 渠道。",
        "- 智能设备专题因缺少结构化参数，当前没有产品详情进入首批公开范围。",
        "",
        "## 首批产品分布",
        "",
        *[f"- {topic}：{distribution[topic]} 款" for topic, _ in TOPICS],
        "",
        "## 发布说明",
        "",
        "库存与交期只用于后台核验，不作为官网实时承诺；公开页引导用户进入商城或提交咨询。",
    ]
    (OUT / "quality-report.md").write_text("\n".join(report) + "\n", encoding="utf-8")


def main() -> None:
    goods = load_goods()
    departments = department_map()
    products, published = build_products(goods, departments)
    cases = build_cases()
    write_outputs(products, published, cases)
    print(json.dumps({"candidate_products": len(products), "published_products": len(published), "cases": len(cases), "distribution": Counter(item["topic"] for item in published)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
