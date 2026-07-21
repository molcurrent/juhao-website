from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

from source_freeze import verify_external_sources


ROOT = Path(__file__).resolve().parents[1]
KB = Path("/Users/mac/Documents/juhao数据库/企业知识库")
MALL = KB / "商城系统"
SQL_SOURCE = Path("/Users/mac/Documents/juhao数据库/juhao_mall_2026-07-10_02-41-52_mysql_data.sql")
OUT = ROOT / "content" / "governance"
RUNTIME = ROOT / "content" / "runtime"
PREVIEW_DATE = "2026-07-14"

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
    "射灯": 9,
    "家居顶灯": 6,
}

# These frozen source records are standard spotlights even though the source
# topic index currently files them under engineering customisation.
SEMANTIC_TOPIC_OVERRIDES = {
    "12265": ("射灯", "spotlights"),
    "12266": ("射灯", "spotlights"),
    "12267": ("射灯", "spotlights"),
}

ADDITIONAL_CANDIDATES = {
    "家居智能设备": ["11689", "11691", "11694", "11695", "11696", "665", "664", "587"],
    "射灯": ["6692", "10505", "10506", "10507", "10508"],
}

CASES = [
    (226, "深圳华发冰雪世界 JW 万豪酒店", "jw-marriott-shenzhen-huafa-snow-world", "酒店", "签约/中标"),
    (231, "上饶广丰铂尔曼酒店", "pullman-shangrao-guangfeng", "酒店", "签约/中标"),
    (228, "苏州金融街君悦酒店", "grand-hyatt-suzhou-financial-street", "酒店", "签约/中标"),
    (229, "南通海门希尔顿逸林酒店", "doubletree-nantong-haimen", "酒店", "签约/中标"),
    (220, "扬州经开区一河两岸户外亮化工程", "yangzhou-riverfront-lighting", "户外亮化", "签约/中标"),
    (199, "邢台金融中心", "xingtai-financial-center", "商业综合体", "中标报道/助力口径"),
]

CASE_SOLUTION_ROUTES = {
    226: "/solutions/hospitality",
    231: "/solutions/hospitality",
    228: "/solutions/hospitality",
    229: "/solutions/hospitality",
    220: "/solutions/public",
    199: "/solutions/commercial",
}

FORBIDDEN = re.compile(r"测试|饮料|食品|纸品|手机|三只松鼠|同仁堂|维达")
LINK_RE = re.compile(r"\[\[商城系统/商品说明/([^|\]]+)\|([^\]]+)\]\]")
FIELD_RE = re.compile(r"^(ID|分类|价格|创建时间|上架时间):\s*(.*)$", re.MULTILINE)
IMAGE_RE = re.compile(r"https://[^)\s]+\.(?:png|jpe?g|webp)", re.I)
COVER_IMAGE_RE = re.compile(r'^coverImg:\s*"([^"]+)"', re.MULTILINE)
MODEL_RE = re.compile(r"[A-Za-z0-9]+(?:[-+*/.][A-Za-z0-9]+)*(?:[-+*/.][A-Za-z0-9]+)*")

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

PAGE_SOURCE_FILES = [
    ROOT / "app" / "_data" / "pages.ts",
    ROOT / "app" / "_data" / "contract-pages.ts",
]
COMPANY_NEWS_SOURCE = OUT / "company-news-source.json"
HELP_ARTICLE_INVENTORY = OUT / "help-article-inventory.json"
PRODUCT_CANDIDATES_OUTPUT = OUT / "product-candidates.json"
RUNTIME_LEDGER_OUTPUT = RUNTIME / "publication-ledger.json"

TOPIC_CASE_RELATIONS = {
    "spotlights": [
        "/cases/jw-marriott-shenzhen-huafa-snow-world",
        "/cases/pullman-shangrao-guangfeng",
    ],
}

GOVERNANCE_FIELDS = {
    "route",
    "source_type",
    "source_path",
    "reviewer",
    "reviewed_at",
    "last_verified_at",
    "publish_status",
    "seo_candidate",
    "searchable",
    "indexable",
    "index_eligible",
    "canonical_slug",
    "published_at",
    "image_rights_status",
    "related_products",
    "related_cases",
    "related_articles",
    "related_routes",
    "content_scope",
    "source_locator",
    "source_sha256",
    "previewed_at",
    "og_image",
    "media_authorization_batch_id",
    "candidate_reason",
    "route_state",
    "publication_blockers",
    "source_file",
    "source_hash",
    "stock",
    "delivery",
    "warranty",
    "sale_time",
}

ISO_DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def kb_relative(path: Path) -> str:
    return str(path.relative_to(KB))


def iso_date(value: object) -> str | None:
    match = ISO_DATE_RE.match(str(value or ""))
    return match.group(1) if match else None


def latest_date(*values: object) -> str:
    dates = [parsed for value in values if (parsed := iso_date(value))]
    return max(dates) if dates else "unknown"


def load_previous_ledger() -> dict[str, dict]:
    path = OUT / "content-ledger.json"
    if not path.exists():
        return {}
    records = json.loads(path.read_text(encoding="utf-8"))
    return {item["route"]: item for item in records if isinstance(item, dict) and isinstance(item.get("route"), str)}


def stable_previous_date(previous: dict, field: str, fallback: str = "unknown") -> str:
    existing = iso_date(previous.get(field))
    if field == "published_at" and not existing:
        existing = iso_date(previous.get("publish_date"))
    return existing or fallback


def stable_route_dates(previous_by_route: dict[str, dict], route: str, updated_at: str = "unknown", published_at: str = "unknown") -> dict[str, str]:
    previous = previous_by_route.get(route, {})
    stable_updated_at = iso_date(updated_at) or "unknown"
    stable_published_at = stable_previous_date(previous, "published_at", iso_date(published_at) or stable_updated_at)
    stable_verified_at = stable_previous_date(previous, "last_verified_at", stable_updated_at if stable_updated_at != "unknown" else stable_published_at)
    return {
        "last_verified_at": stable_verified_at,
        "published_at": stable_published_at,
        "updated_at": stable_updated_at,
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
                    "create_time": row[46],
                    "delivery": row[60] if row[60] != "NULL" else "",
                    "warranty": row[64] if row[64] != "NULL" else "",
                }
    return result


def load_article_dates() -> dict[str, str]:
    result: dict[str, str] = {}
    with SQL_SOURCE.open(encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if not line.startswith("INSERT INTO `jh_articles`"):
                continue
            values = line.split(" VALUES ", 1)[1].rstrip(";\n")
            for row in parse_sql_values(values):
                if len(row) >= 9 and (created_at := iso_date(row[8])):
                    result[row[0]] = created_at
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
    topic, topic_slug = SEMANTIC_TOPIC_OVERRIDES.get(source_id, (topic, topic_slug))
    sql = goods.get(source_id)
    images = unique(IMAGE_RE.findall(text))
    if not sql or not images or FORBIDDEN.search(f"{label} {fields.get('分类', '')}"):
        return None
    parameters = parse_parameters(text)
    model_match = MODEL_RE.search(label.strip())
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
        "review_status": "needs_review",
        "machine_status": "passed" if publishable else "needs_review",
        "sale_status": status,
        "fact_status": "来源字段已通过机器校验" if publishable else "需企业确认",
        "parameter_completeness": f"{completeness}%",
        "parameter_count": len(parameters),
        "image_status": "完整" if len(images) >= 4 else "缺失",
        "image_authorization": "公开使用授权待核验",
        "image_count": len(images),
        "department": departments.get(source_id, "未确认"),
        "publish_date": "",
        "updated_at": latest_date(fields.get("上架时间"), fields.get("创建时间"), sql["sale_time"], sql["create_time"]),
        "seo_slug": f"/products/{topic_slug}/{source_id}",
        "legacy_url": "",
        "source_file": kb_relative(path),
        "source_hash": sha256_file(path),
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
    for topic, source_ids in ADDITIONAL_CANDIDATES.items():
        topic_slug = next(slug for name, slug in TOPICS if name == topic)
        for source_id in source_ids:
            matches = list((MALL / "商品说明").glob(f"*_{source_id}.md"))
            if len(matches) != 1:
                raise ValueError(f"candidate {source_id}: expected one product markdown, found {len(matches)}")
            stem = matches[0].stem
            title_match = re.search(r"^# 商品说明：(.+)$", matches[0].read_text(encoding="utf-8"), re.MULTILINE)
            label = title_match.group(1).strip() if title_match else stem.rsplit("_", 1)[0]
            record = product_record(topic, topic_slug, stem, label, departments, goods)
            if not record:
                raise ValueError(f"candidate {source_id}: product source did not pass minimum source parsing")
            record["publishable"] = False
            record["machine_status"] = "needs_review"
            record["fact_status"] = "候选资料存在，关键发布条件未满足"
            if source_id in {"6692", "10505", "10506", "10507", "10508"}:
                record["candidate_reason"] = "JH31L331 系列存在未解析规格行，型号与规格映射未确认。"
                record["publication_blockers"] = [
                    "unresolved_variant_mapping",
                    "undefined_spec_rows",
                    "verified_optics_dimensions_driver_missing",
                    "media_rights_unverified",
                ]
            else:
                record["candidate_reason"] = "智能设备缺少结构化参数、协议兼容、部署条件与售后边界。"
                record["publication_blockers"] = [
                    "structured_parameters_missing",
                    "protocol_compatibility_unverified",
                    "deployment_support_boundary_missing",
                    "media_rights_unverified",
                ]
            record["route_state"] = "candidate_only"
            candidate_pool.append(record)
            used_candidates.add(source_id)
    published: list[dict] = []
    for topic, _ in TOPICS:
        limit = PUBLISH_LIMITS.get(topic, 3)
        published.extend([item for item in candidate_pool if item["topic"] == topic and item["publishable"]][:limit])
    return candidate_pool, published


def build_cases(article_dates: dict[str, str]) -> list[dict]:
    rows: list[dict] = []
    for source_id, title, slug, case_type, stage in CASES:
        matches = list((MALL / "帮助文章").glob(f"*_{source_id}.md"))
        if not matches:
            continue
        source_text = matches[0].read_text(encoding="utf-8")
        images = unique(IMAGE_RE.findall(source_text))
        cover_match = COVER_IMAGE_RE.search(source_text)
        cover_image = cover_match.group(1) if cover_match else ""
        body_images = [image for image in images if image != cover_image]
        rows.append({
            "source": "企业知识库帮助文章",
            "source_id": str(source_id),
            "content_type": "案例",
            "title": title,
            "model": "",
            "topic": case_type,
            "topic_slug": "",
            "review_status": "needs_review",
            "machine_status": "passed",
            "sale_status": "",
            "fact_status": "来源项目阶段已核对，交付状态待签核",
            "parameter_completeness": "",
            "parameter_count": "",
            "image_status": "有来源正文图" if body_images else "缺失",
            "image_authorization": "公开使用授权待核验",
            "image_count": len(body_images),
            "body_image_count": len(body_images),
            "cover_image": cover_image,
            "department": "工程项目",
            "publish_date": "",
            "updated_at": article_dates.get(str(source_id), "unknown"),
            "seo_slug": f"/cases/{slug}",
            "legacy_url": "",
            "source_file": kb_relative(matches[0]),
            "source_hash": sha256_file(matches[0]),
            "primary_image": body_images[0] if body_images else cover_image,
            "category": case_type,
            "sale_time": stage,
            "stock": "",
            "delivery": "",
            "warranty": "",
            "parameters": [],
            "gallery": body_images[1:7],
            "installation_notes": [],
            "publishable": True,
            "quality_score": "",
        })
    return rows


def direct_page_type(route: str) -> str:
    if route.startswith("/news/"):
        return "文章"
    if route == "/news":
        return "内容中心"
    if route == "/products":
        return "产品中心"
    if route == "/cases":
        return "案例中心"
    if route.startswith("/solutions"):
        return "解决方案"
    if route.startswith("/about"):
        return "品牌"
    if route in {"/legal", "/privacy"}:
        return "法律合规"
    if route in {"/search", "/downloads", "/mall", "/contact"}:
        return "功能页"
    return "服务页面"


def page_source(route: str, source_file: Path) -> tuple[str, str, str]:
    if route == "/products":
        return "knowledge_base_topic_indexes+mall_sql", "products", "content/governance/product-candidates.json"
    if route == "/cases":
        return "knowledge_base_help_articles", "199,220,226,228,229,231", "content/governance/help-article-inventory.json"
    if route == "/about/history":
        return "knowledge_base_company_news", "149,160,167,184,185,188,192,205,223,224,225,232", "content/governance/help-article-inventory.json"
    return "repository_content", route.removeprefix("/") or "home", str(source_file.relative_to(ROOT))


def normalize_related_href(href: str) -> str | None:
    if not href.startswith("/"):
        return None
    return href.split("?", 1)[0].split("#", 1)[0]


def company_news_records() -> list[dict]:
    help_by_id = {
        str(item["source_id"]): item
        for item in json.loads(HELP_ARTICLE_INVENTORY.read_text(encoding="utf-8"))
    }
    rows: list[dict] = []
    for item in json.loads(COMPANY_NEWS_SOURCE.read_text(encoding="utf-8")):
        route = item["path"]
        help_item = help_by_id[str(item["source_id"])]
        related_routes = unique([
            normalized
            for related in item["related"]
            if (normalized := normalize_related_href(related["href"]))
        ])
        published_at = item["published"]
        rows.append({
            "source": "企业商城资讯 SQL",
            "source_id": str(item["source_id"]),
            "source_type": item["source_type"],
            "source_path": "content/governance/help-article-inventory.json",
            "source_locator": help_item["source_path"],
            "source_sha256": help_item["source_hash"],
            "content_type": "文章",
            "title": item["title"],
            "route": route,
            "review_status": "needs_review",
            "reviewer": "unknown",
            "reviewed_at": "unknown",
            "last_verified_at": published_at,
            "publish_status": "published",
            "seo_candidate": True,
            "searchable": True,
            "index_eligible": False,
            "indexable": False,
            "canonical_slug": route,
            "published_at": published_at,
            "updated_at": published_at,
            "image_rights_status": "approved",
            "related_products": [],
            "related_cases": [value for value in related_routes if value.startswith("/cases/")],
            "related_articles": [],
            "related_routes": related_routes,
            "content_scope": f"页面仅发布保守阶段摘要与已批准原创栏目示意图；来源中的 {len(item['remote_media_sources'])} 个远程媒体候选保持未发布，宣传性判断和未核验实施状态不作为结论。",
            "publish_date": published_at,
            "seo_slug": route,
        })
    return rows


def direct_page_records(published: list[dict], cases: list[dict], previous_by_route: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    all_product_routes = [item["seo_slug"] for item in published]
    all_case_routes = [item["seo_slug"] for item in cases]

    for source_file in PAGE_SOURCE_FILES:
        text = source_file.read_text(encoding="utf-8")
        matches = list(re.finditer(r'^  "([^"]+)":\s*\{', text, re.MULTILINE))
        for index, match in enumerate(matches):
            block_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            block = text[match.start():block_end]
            route = f"/{match.group(1)}"
            title_match = re.search(r'\btitle:\s*"([^"]+)"', block)
            published_match = re.search(r'\bpublished:\s*"(\d{4}-\d{2}-\d{2})"', block)
            noindex = bool(re.search(r"\bnoindex:\s*true", block))
            related_routes = unique([
                normalized
                for href in re.findall(r'\bhref:\s*"([^"]+)"', block)
                if (normalized := normalize_related_href(href))
            ])
            source_type, source_id, source_path = page_source(route, source_file)
            source_date = published_match.group(1) if published_match else "unknown"
            dates = stable_route_dates(previous_by_route, route, source_date, source_date)
            row = {
                "source": source_type,
                "source_id": source_id,
                "source_type": source_type,
                "source_path": source_path,
                "content_type": direct_page_type(route),
                "title": title_match.group(1) if title_match else route,
                "route": route,
                "review_status": "needs_review",
                "reviewer": "unknown",
                "reviewed_at": "unknown",
                "last_verified_at": dates["last_verified_at"],
                "publish_status": "published",
                "seo_candidate": not noindex,
                "searchable": not noindex,
                "indexable": False,
                "canonical_slug": route,
                "published_at": dates["published_at"],
                "updated_at": dates["updated_at"],
                "image_rights_status": "unknown",
                "related_products": [item for item in related_routes if re.fullmatch(r"/products/[^/]+/\d+", item)],
                "related_cases": [item for item in related_routes if item.startswith("/cases/")],
                "related_articles": [item for item in related_routes if item.startswith("/news/") and "/page/" not in item],
                "related_routes": related_routes,
                "content_scope": "当前网站私有预览页面；企业事实、审核主体、更新日期和媒体公开授权仍按台账逐项复核。",
                "publish_date": dates["published_at"] if dates["published_at"] != "unknown" else "",
                "seo_slug": route,
            }
            if route == "/products":
                row["related_products"] = all_product_routes
            elif route == "/cases":
                row["related_cases"] = all_case_routes
            rows.append(row)

    scene_source = ROOT / "content" / "scene-resources.ts"
    if scene_source.exists():
        product_routes = {item["source_id"]: item["seo_slug"] for item in published}
        rows_by_route = {item["route"]: item for item in rows}
        scene_pattern = re.compile(
            r'(residential|hospitality|commercial|public|industrial):\s*\{\s*'
            r'topic:\s*"([^"]+)",\s*'
            r'(?:product:\s*"(\d+)",\s*)?'
            r'(?:study:\s*"([^"]+)",\s*)?'
            r'topicImage:\s*"[^"]+"\s*\}'
        )
        for scene, topic_slug, product_id, case_slug in scene_pattern.findall(scene_source.read_text(encoding="utf-8")):
            row = rows_by_route[f"/solutions/{scene}"]
            row["related_products"] = [product_routes[product_id]] if product_id else []
            row["related_cases"] = [f"/cases/{case_slug}"] if case_slug else []
            row["related_routes"] = unique([*row["related_routes"], f"/products/{topic_slug}"])
    return rows


def static_route_records(published: list[dict], cases: list[dict], previous_by_route: dict[str, dict]) -> list[dict]:
    direct_pages = direct_page_records(published, cases, previous_by_route)
    article_records = company_news_records()
    article_routes = [item["route"] for item in article_records]
    home_dates = stable_route_dates(previous_by_route, "/")
    rows = [{
        "source": "repository_composition_with_knowledge_base_references",
        "source_id": "149,160,167,184,185,188,192,199,205,220,223,224,225,226,228,229,231,232",
        "source_type": "repository_composition_with_knowledge_base_references",
        "source_path": "features/home/HomePage.tsx",
        "content_type": "首页",
        "title": "钜豪照明首页",
        "route": "/",
        "review_status": "needs_review",
        "reviewer": "unknown",
        "reviewed_at": "unknown",
        "last_verified_at": home_dates["last_verified_at"],
        "publish_status": "published",
        "seo_candidate": True,
        "searchable": True,
        "indexable": False,
        "canonical_slug": "/",
        "published_at": home_dates["published_at"],
        "updated_at": home_dates["updated_at"],
        "image_rights_status": "unknown",
        "related_products": [],
        "related_cases": [
            "/cases/jw-marriott-shenzhen-huafa-snow-world",
            "/cases/pullman-shangrao-guangfeng",
        ],
        "related_articles": [
            "/news/guangzhou-international-lighting-exhibition-2026",
            "/news/dealer-conference-spring-2026",
        ],
        "related_routes": ["/products", "/solutions", "/cases", "/news", "/contact"],
        "content_scope": "首页证据卡与内容入口沿用当前企业资料编号；企业事实、审核主体、更新日期和媒体公开授权仍需逐项复核。",
        "publish_date": "",
        "seo_slug": "/",
    }]
    rows.extend(direct_pages)
    rows.extend(article_records)

    published_by_topic: dict[str, list[str]] = {}
    for item in published:
        published_by_topic.setdefault(item["topic_slug"], []).append(item["seo_slug"])
    for topic, slug in TOPICS:
        route = f"/products/{slug}"
        dates = stable_route_dates(previous_by_route, route)
        has_published_products = bool(published_by_topic.get(slug))
        rows.append({
            "source": "knowledge_base_topic_index+repository_topic_guide",
            "source_id": slug,
            "source_type": "knowledge_base_topic_index+repository_topic_guide",
            "source_path": "content/governance/product-candidates.json",
            "source_locator": f"商城系统/商品专题分类/{topic}_专题索引.md",
            "source_sha256": sha256_file(MALL / "商品专题分类" / f"{topic}_专题索引.md"),
            "content_type": "产品专题",
            "title": topic,
            "route": route,
            "review_status": "needs_review",
            "reviewer": "unknown",
            "reviewed_at": "unknown",
            "last_verified_at": dates["last_verified_at"],
            "publish_status": "published",
            "seo_candidate": has_published_products,
            "searchable": has_published_products,
            "indexable": False,
            "canonical_slug": route,
            "published_at": dates["published_at"],
            "updated_at": dates["updated_at"],
            "image_rights_status": "needs_review" if has_published_products else "unknown",
            "related_products": published_by_topic.get(slug, []),
            "related_cases": TOPIC_CASE_RELATIONS.get(slug, []),
            "related_articles": [],
            "related_routes": ["/products", "/solutions", "/contact"],
            "content_scope": "专题页按企业知识库候选和当前机器门禁产品组织；缺失参数、项目证明和媒体公开授权不得推定为已确认。",
            "publish_date": "",
            "seo_slug": f"/products/{slug}",
        })

    pagination_source = (ROOT / "lib" / "news-pagination.ts").read_text(encoding="utf-8")
    page_size = int(re.search(r"NEWS_PAGE_SIZE\s*=\s*(\d+)", pagination_source).group(1))
    for offset in range(page_size, len(article_routes), page_size):
        page_number = offset // page_size + 1
        route = f"/news/page/{page_number}"
        page_article_routes = article_routes[offset:offset + page_size]
        source_date = latest_date(*(next(item["updated_at"] for item in article_records if item["route"] == article_route) for article_route in page_article_routes))
        dates = stable_route_dates(previous_by_route, route, source_date, source_date)
        rows.append({
            "source": "derived_news_collection",
            "source_id": f"news-page-{page_number}",
            "source_type": "derived_news_collection",
            "source_path": "app/_data/pages.ts",
            "content_type": "内容分页",
            "title": f"新闻与资讯第 {page_number} 页",
            "route": route,
            "review_status": "needs_review",
            "reviewer": "unknown",
            "reviewed_at": "unknown",
            "last_verified_at": dates["last_verified_at"],
            "publish_status": "published",
            "seo_candidate": True,
            "searchable": False,
            "indexable": False,
            "canonical_slug": route,
            "published_at": dates["published_at"],
            "updated_at": dates["updated_at"],
            "image_rights_status": "unknown",
            "related_products": [],
            "related_cases": [],
            "related_articles": page_article_routes,
            "related_routes": ["/news"],
            "content_scope": "由私有预览资讯记录派生的内容分页；不新增独立企业事实，人工审核完成前不可索引。",
            "publish_date": "",
            "seo_slug": route,
        })

    success_dates = stable_route_dates(previous_by_route, "/contact/success")
    rows.append({
        "source": "application_route",
        "source_id": "contact-success",
        "source_type": "application_route",
        "source_path": "app/contact/success/page.tsx",
        "content_type": "功能页",
        "title": "咨询提交成功",
        "route": "/contact/success",
        "review_status": "needs_review",
        "reviewer": "unknown",
        "reviewed_at": "unknown",
        "last_verified_at": success_dates["last_verified_at"],
        "publish_status": "published",
        "seo_candidate": False,
        "searchable": False,
        "indexable": False,
        "canonical_slug": "/contact/success",
        "published_at": success_dates["published_at"],
        "updated_at": success_dates["updated_at"],
        "image_rights_status": "not_applicable",
        "related_products": [],
        "related_cases": [],
        "related_articles": [],
        "related_routes": ["/", "/contact"],
        "content_scope": "表单回执功能页；保持 noindex，不承载企业事实或 SEO 内容。",
        "publish_date": "",
        "seo_slug": "/contact/success",
    })
    return rows


def apply_dynamic_governance(products: list[dict], published: list[dict], cases: list[dict], previous_by_route: dict[str, dict]) -> None:
    published_ids = {item["source_id"] for item in published}
    published_by_topic: dict[str, list[str]] = {}
    for item in published:
        published_by_topic.setdefault(item["topic_slug"], []).append(item["seo_slug"])

    for item in products:
        route_published = item["source_id"] in published_ids
        item.setdefault(
            "candidate_reason",
            "已通过当前机器门禁并进入私有预览。" if route_published else "专题候选池记录尚未通过全部发布门禁。",
        )
        item.setdefault(
            "publication_blockers",
            ["human_product_review"] if route_published else ["machine_review_incomplete", "human_product_review", "media_rights_signoff"],
        )
        item["route_state"] = "private_preview" if route_published else "candidate_only"
        item["image_authorization"] = (
            "当前站点媒体批次授权已登记；产品事实仍待负责人签核"
            if route_published
            else "公开使用授权待核验"
        )
        dates = stable_route_dates(previous_by_route, item["seo_slug"], item["updated_at"], item["updated_at"])
        item["publish_date"] = dates["published_at"] if route_published and dates["published_at"] != "unknown" else ""
        item.update({
            "route": item["seo_slug"],
            "source_type": "knowledge_base_product_markdown+mall_sql",
            "source_path": "content/governance/product-candidates.json",
            "source_locator": item["source_file"],
            "source_sha256": item["source_hash"],
            "reviewer": "unknown",
            "reviewed_at": "unknown",
            "last_verified_at": dates["last_verified_at"],
            "publish_status": "published" if route_published else "needs_review",
            "seo_candidate": route_published,
            "searchable": route_published,
            "index_eligible": False,
            "indexable": False,
            "canonical_slug": item["seo_slug"],
            "published_at": dates["published_at"] if route_published else "unknown",
            "updated_at": dates["updated_at"],
            "image_rights_status": "approved" if route_published else "needs_review",
            "previewed_at": PREVIEW_DATE if route_published else "unknown",
            "og_image": "",
            "media_authorization_batch_id": "oss-batch-2026-07-14-current-site-341" if route_published else "",
            "related_products": [route for route in published_by_topic.get(item["topic_slug"], []) if route != item["seo_slug"]][:3] if route_published else [],
            "related_cases": TOPIC_CASE_RELATIONS.get(item["topic_slug"], []) if route_published else [],
            "related_articles": [],
            "related_routes": [f"/products/{item['topic_slug']}", "/products", "/contact"],
            "content_scope": (
                "产品状态、结构化字段和当前页面素材已通过现有门禁；媒体批次授权已登记，产品事实与人工审核记录仍待负责人签核。"
                if route_published
                else "候选产品尚未进入页面显示集；机器门禁、人工事实审核与媒体使用范围仍待逐项确认。"
            ),
        })

    for item in cases:
        source_id = int(item["source_id"])
        solution_route = CASE_SOLUTION_ROUTES[source_id]
        dates = stable_route_dates(previous_by_route, item["seo_slug"], item["updated_at"], item["updated_at"])
        item["publish_date"] = dates["published_at"] if dates["published_at"] != "unknown" else ""
        item["image_authorization"] = "当前站点媒体批次授权已登记；项目事实与页面选用仍待负责人签核"
        item.update({
            "route": item["seo_slug"],
            "source_type": "knowledge_base_project_article",
            "source_path": "content/governance/help-article-inventory.json",
            "source_locator": item["source_file"],
            "source_sha256": item["source_hash"],
            "reviewer": "unknown",
            "reviewed_at": "unknown",
            "last_verified_at": dates["last_verified_at"],
            "publish_status": "published",
            "seo_candidate": True,
            "searchable": True,
            "index_eligible": False,
            "indexable": False,
            "canonical_slug": item["seo_slug"],
            "published_at": dates["published_at"],
            "updated_at": dates["updated_at"],
            "image_rights_status": "approved",
            "previewed_at": PREVIEW_DATE,
            "og_image": "",
            "media_authorization_batch_id": "oss-batch-2026-07-14-current-site-341",
            "related_products": [],
            "related_cases": [],
            "related_articles": [],
            "related_routes": ["/cases", solution_route, "/contact"],
            "content_scope": "来源文章记录的项目阶段已核对，当前站点媒体批次授权已登记；施工、供货、交付、完工、最终产品与页面选用仍待负责人签核，不从图片推断空间。",
        })


def apply_publication_interface(ledger: list[dict]) -> None:
    og_path = OUT / "route-og.json"
    og_by_route = {
        item["route"]: item["path"]
        for item in json.loads(og_path.read_text(encoding="utf-8"))
    } if og_path.exists() else {}
    for item in ledger:
        item["index_eligible"] = (
            item["publish_status"] == "published"
            and bool(item["seo_candidate"])
            and item["review_status"] == "approved"
            and item["reviewer"] != "unknown"
            and item["reviewed_at"] != "unknown"
            and item["image_rights_status"] in {"approved", "not_applicable"}
        )
        item["indexable"] = False
        item["published_at"] = ""
        if not item.get("source_sha256"):
            source_path = ROOT / item.get("source_path", "")
            item["source_sha256"] = sha256_file(source_path) if source_path.is_file() else "unknown"
        item.setdefault("previewed_at", PREVIEW_DATE if item["publish_status"] == "published" else "unknown")
        item["og_image"] = og_by_route.get(item["route"], item.get("og_image", ""))
        item.setdefault("media_authorization_batch_id", "")


def write_outputs(products: list[dict], published: list[dict], cases: list[dict], static_routes: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    ledger = products + cases + static_routes
    PRODUCT_CANDIDATES_OUTPUT.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    apply_publication_interface(ledger)
    excluded_flat_fields = {"parameters", "gallery", "installation_notes", "publishable", "quality_score"}
    flat_fields = list(dict.fromkeys(
        key
        for row in ledger
        for key in row
        if key not in excluded_flat_fields
    ))
    with (OUT / "content-ledger.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=flat_fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows({
            key: json.dumps(value, ensure_ascii=False) if isinstance((value := row.get(key, "")), (list, dict)) else value
            for key in flat_fields
        } for row in ledger)
    (OUT / "content-ledger.json").write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    public_products = [{key: value for key, value in item.items() if key not in GOVERNANCE_FIELDS} for item in published]
    (OUT / "published-products.json").write_text(json.dumps(public_products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    runtime_fields = [
        "route",
        "content_type",
        "title",
        "publish_status",
        "seo_candidate",
        "searchable",
        "index_eligible",
        "indexable",
        "canonical_slug",
        "published_at",
        "updated_at",
        "previewed_at",
        "og_image",
        "media_authorization_batch_id",
        "source_sha256",
    ]
    runtime_ledger = [{field: item.get(field, "") for field in runtime_fields} for item in ledger]
    RUNTIME_LEDGER_OUTPUT.write_text(json.dumps(runtime_ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
        "- 仅把 10 个首批专题中通过机器门禁的产品写入私有预览详情页数据。",
        "",
        "## 结果",
        "",
        f"- 统一发布台账：{len(ledger)} 条记录，其中 {sum(item['publish_status'] == 'published' for item in ledger)} 条当前私有预览路由、{sum(item['indexable'] for item in ledger)} 条可索引路由。",
        "- 内容边界：通用照明专业文章不进入官网或网站治理快照；资讯仅保留可追溯的 JUHAO 企业与项目来源记录。",
        f"- 路由覆盖：{len(static_routes)} 条静态/功能路由，{len(published)} 条产品详情，{len(cases)} 条案例详情。",
        f"- 待治理：{sum(item['reviewer'] == 'unknown' for item in ledger)} 条未登记审核人，{sum(item['image_rights_status'] in {'needs_review', 'unknown'} for item in ledger)} 条仍需页面级媒体状态核对；批次授权不替代内容事实审核。",
        f"- 审核台账：{len(products)} 款候选；在原有专题候选池基础上增加 8 款智能设备和 5 款 JH31L331 证据候选。",
        f"- 私有预览：{len(published)} 款；产品 ID 唯一，无跨专题重复发布。当前站点媒体批次授权已登记，产品事实人工审核完成前不进入公开 SEO。",
        "- 专题发布上限：射灯 9 款、家居顶灯 6 款；工程定制不再以标准射灯凑数，其余专题各 3 款。",
        f"- 参数完整度：最低 {min(completeness)}%，平均 {sum(completeness) / len(completeness):.1f}%。",
        "- 在售门禁：`isSale=1`、`goodsStatus=1`、`dataFlag=1`。",
        "- 图片门禁：至少 4 张，且全部来自企业商城 OSS 渠道。",
        "- 智能设备专题因缺少结构化参数，当前没有产品详情进入首批私有预览范围。",
        "",
        "## 首批产品分布",
        "",
        *[f"- {topic}：{distribution[topic]} 款" for topic, _ in TOPICS],
        "",
        "## 发布说明",
        "",
        "库存与交期只用于后台核验，不作为官网实时承诺；预览页引导用户进入商城或提交咨询。",
    ]
    (OUT / "quality-report.md").write_text("\n".join(report) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--catalog-v2",
        action="store_true",
        help="Build the frozen 2026-07-16 family/variant catalog sample.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify catalog-v2 generated outputs without rewriting them.",
    )
    args = parser.parse_args()
    if args.catalog_v2:
        from product_catalog_v2 import build_catalog_v2

        report = build_catalog_v2(ROOT, check=args.check)
        print(
            json.dumps(
                {
                    "source_products": report["families"]["source_products"],
                    "derived_families": report["families"]["derived_families"],
                    "sample": report["sample"]["actual"],
                    "existing_routes_reserved": report["sample"][
                        "existing_routes_reserved"
                    ],
                    "acceptance": report["acceptance"],
                },
                ensure_ascii=False,
            )
        )
        return
    if args.check:
        parser.error("--check currently requires --catalog-v2")

    verify_external_sources({"help", "products", "topics", "mall_sql"})
    previous_by_route = load_previous_ledger()
    goods = load_goods()
    article_dates = load_article_dates()
    departments = department_map()
    products, published = build_products(goods, departments)
    cases = build_cases(article_dates)
    apply_dynamic_governance(products, published, cases, previous_by_route)
    static_routes = static_route_records(published, cases, previous_by_route)
    projected_ledger = products + cases + static_routes
    expected_metrics = {
        "records": 162,
        "published": 81,
        "searchable": 67,
        "seo_candidates": 68,
        "professional_articles": 0,
        "all_articles": 8,
        "news_pages": 2,
    }
    actual_metrics = {
        "records": len(projected_ledger),
        "published": sum(item["publish_status"] == "published" for item in projected_ledger),
        "searchable": sum(item["publish_status"] == "published" and item["searchable"] for item in projected_ledger),
        "seo_candidates": sum(item["seo_candidate"] for item in projected_ledger),
        "professional_articles": sum(item.get("source_type") == "knowledge_base_professional_article_review" for item in projected_ledger),
        "all_articles": sum(item["content_type"] == "文章" for item in projected_ledger),
        "news_pages": 1 + sum(item["content_type"] == "内容分页" for item in projected_ledger),
    }
    if actual_metrics != expected_metrics:
        raise ValueError(f"publication snapshot drifted: expected={expected_metrics}, actual={actual_metrics}")
    write_outputs(products, published, cases, static_routes)
    print(json.dumps({
        "candidate_products": len(products),
        "published_products": len(published),
        "cases": len(cases),
        "static_routes": len(static_routes),
        "indexable_routes": sum(item["indexable"] for item in products + cases + static_routes),
        "publication_metrics": actual_metrics,
        "distribution": Counter(item["topic"] for item in published),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
