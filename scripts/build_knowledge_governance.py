from __future__ import annotations

import csv
import hashlib
import json
import os
import re
from collections import Counter
from pathlib import Path

from source_freeze import verify_external_sources


ROOT = Path(__file__).resolve().parents[1]
KB = Path(os.environ.get("JUHAO_KNOWLEDGE_BASE", "/Users/mac/Documents/juhao数据库/企业知识库"))
HELP = KB / "商城系统" / "帮助文章"
SQL_SOURCE = Path(
    os.environ.get(
        "JUHAO_MALL_SQL",
        "/Users/mac/Documents/juhao数据库/juhao_mall_2026-07-10_02-41-52_mysql_data.sql",
    )
)
GOVERNANCE = ROOT / "content" / "governance"
RUNTIME = ROOT / "content" / "runtime"

HELP_JSON_OUTPUT = GOVERNANCE / "help-article-inventory.json"
HELP_CSV_OUTPUT = GOVERNANCE / "help-article-inventory.csv"
EXCLUSIONS_OUTPUT = GOVERNANCE / "hard-exclusions.json"
LEGACY_ROUTES_OUTPUT = RUNTIME / "legacy-news-routes.json"

PROJECT_IDS = {154, 155, 156, 157, 158, 159, 181, 182, 183, 186, 187, 189, 190, 191, 193, 194, 195, 199, 200, 204, 206, 207, 208, 210, 216, 217, 218, 219, 220, 221, 226, 228, 229, 231}
HONOR_IDS = {126, 151, 152, 167, 171, 184, 185, 222, 223, 225}
SMART_CAPABILITY_IDS = {124, 127, 145, 160, 166, 180}
PRODUCT_TOPIC_IDS = {146, 147, 169}
SMART_TUTORIAL_IDS = set(range(173, 180))
IES_IDS = {196, 201, 203, 209, 227, 230}
VIDEO_IDS = {118, 119, 120, 121, 170}
PROHIBITED_LEGACY_IDS = set(range(1, 13)) | {14, 15, 17, 18} | set(range(27, 34)) | set(range(105, 110)) | set(range(111, 115)) | set(range(130, 141)) | {143, 148}
SQL_EXCLUDED_IDS = {25, 26, 110, 115, 116, 162, 163, 198, 202, 211, 212, 213, 214, 215}
NON_LIGHTING_PRODUCT_IDS = {4014, 4019, 4020, 4021, 5181, 11702, 11703}

CASE_ROUTES = {
    199: "/cases/xingtai-financial-center",
    220: "/cases/yangzhou-riverfront-lighting",
    226: "/cases/jw-marriott-shenzhen-huafa-snow-world",
    228: "/cases/grand-hyatt-suzhou-financial-street",
    229: "/cases/doubletree-nantong-haimen",
    231: "/cases/pullman-shangrao-guangfeng",
}
NEWS_ROUTES = {
    217: "/news/nanyandangshan-binyue-resort-hotel-bid",
    218: "/news/dalian-jinzhou-crowne-plaza-hotel-bid",
    219: "/news/kunming-guandu-wyndham-hotel-bid",
    221: "/news/yichang-shouhang-hotel-bid",
    222: "/news/home-lighting-brand-source-record-2025",
    223: "/news/lighting-industry-top10-source-record-2026",
    224: "/news/dealer-conference-spring-2026",
    232: "/news/guangzhou-international-lighting-exhibition-2026",
}
HISTORY_EMBEDDED_IDS = {149, 160, 167, 184, 185, 188, 192, 205, 225}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---\n"):
        raise ValueError("markdown is missing frontmatter")
    frontmatter, body = text[4:].split("\n---\n", 1)
    result: dict[str, object] = {}
    active_list: str | None = None
    for raw_line in frontmatter.splitlines():
        list_match = re.match(r"^\s+-\s+(.*)$", raw_line)
        if list_match and active_list:
            cast = result.setdefault(active_list, [])
            if isinstance(cast, list):
                cast.append(strip_quotes(list_match.group(1)))
            continue
        field_match = re.match(r"^([A-Za-z0-9_\u4e00-\u9fff]+):\s*(.*)$", raw_line)
        if not field_match:
            continue
        key, raw_value = field_match.groups()
        active_list = None
        if not raw_value:
            result[key] = [] if key in {"source_urls", "tags", "keywords"} else ""
            active_list = key if key in {"source_urls", "tags", "keywords"} else None
        elif key in {"source_urls", "tags", "keywords"}:
            value = raw_value.strip()
            if value.startswith("[") and value.endswith("]"):
                value = value[1:-1]
            result[key] = [strip_quotes(item) for item in value.split(",") if strip_quotes(item)]
        else:
            result[key] = strip_quotes(raw_value)
    return result, body


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
        elif char == "'":
            in_string = not in_string
        elif char == "(" and not in_string:
            in_row = True
            row, value = [], []
        elif char == "," and in_row and not in_string:
            row.append("".join(value).strip())
            value = []
        elif char == ")" and in_row and not in_string:
            row.append("".join(value).strip())
            rows.append(row)
            in_row = False
            value = []
        elif in_row:
            value.append(char)
    return rows


def load_help_sql() -> dict[int, dict]:
    result: dict[int, dict] = {}
    with SQL_SOURCE.open(encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if not line.startswith("INSERT INTO `jh_articles`"):
                continue
            for row in parse_sql_values(line.split(" VALUES ", 1)[1].rstrip(";\n")):
                if len(row) != 20:
                    continue
                result[int(row[0])] = {
                    "title": row[2],
                    "is_show": row[3],
                    "data_flag": row[7],
                    "create_time": row[8],
                    "cover": "" if row[11] in {"", "NULL"} else row[11],
                }
    if len(result) != 151:
        raise ValueError(f"expected 151 SQL help articles, got {len(result)}")
    return result


def help_group(source_id: int) -> tuple[str, str, str]:
    if source_id in PROJECT_IDS:
        return "project", "project_record", "project_stage"
    if source_id in HONOR_IDS:
        return "honor", "honor_source_record", "honor_claim"
    if source_id in SMART_CAPABILITY_IDS:
        return "smart_capability", "smart_capability_record", "technical_capability"
    if source_id in PRODUCT_TOPIC_IDS:
        return "product_topic", "product_topic_record", "product_topic"
    if source_id in SMART_TUTORIAL_IDS:
        return "smart_tutorial", "missing_tutorial_payload", "tutorial_asset"
    if source_id in IES_IDS:
        return "ies_asset", "missing_photometric_payload", "photometric_asset"
    if source_id in VIDEO_IDS:
        return "video_asset", "missing_video_payload", "video_asset"
    if source_id in PROHIBITED_LEGACY_IDS:
        return "legacy_template", "prohibited_legacy_content", "legacy_template"
    return "company_dynamic", "company_news_record", "company_event"


def current_route(source_id: int) -> tuple[str, str, list[str]]:
    if source_id in NEWS_ROUTES:
        embedded = ["/about/history"] if source_id in {223, 224, 232} else []
        return "dedicated_route", NEWS_ROUTES[source_id], embedded
    if source_id in CASE_ROUTES:
        return "dedicated_route", CASE_ROUTES[source_id], []
    if source_id in HISTORY_EMBEDDED_IDS:
        return "embedded_reference", "/about/history", ["/about/history"]
    return "inventory_only", "", []


def inventory_policy(source_id: int, domain: str, usage: str) -> tuple[str, str, list[str], list[str], str]:
    if domain == "legacy_template":
        return "prohibited_legacy", "legacy_template_prohibited", ["legacy_template_content"], [], ""
    if domain in {"smart_tutorial", "ies_asset", "video_asset"}:
        return "blocked_missing_payload", "missing_supporting_file", ["supporting_file_missing", "content_facts_not_reviewed"], ["内容负责人", "技术负责人"], f"HELP-{source_id}"
    if usage in {"dedicated_route", "embedded_reference"}:
        return "routed_private_needs_signoff", "source_markdown_available", ["public_claim_signoff", "media_selection_required"], ["内容负责人", "业务负责人"], f"HELP-{source_id}"
    approvers = ["内容负责人", "业务负责人"]
    if domain == "honor":
        approvers.append("品牌负责人")
    return "inventory_needs_evidence", "source_markdown_available", ["dedicated_evidence_missing", "public_claim_signoff"], approvers, f"HELP-{source_id}"


def unverified_claims(domain: str) -> list[str]:
    return {
        "project": ["施工、供货、交付和完工状态", "最终产品清单和成果数据"],
        "honor": ["证书原件、授予方、日期与获奖主体"],
        "smart_capability": ["协议、兼容范围、部署条件与售后边界"],
        "product_topic": ["具体型号、参数、库存、价格与适用结论"],
        "smart_tutorial": ["教程文件、适用设备和操作版本"],
        "ies_asset": ["配光文件、对应型号和测试条件"],
        "video_asset": ["视频文件、画面权利与内容事实"],
        "company_dynamic": ["宣传性判断、未经复核的规模和行业地位"],
        "legacy_template": ["全部旧商城模板内容"],
    }[domain]


def build_help_inventory(sql_rows: dict[int, dict]) -> list[dict]:
    paths: dict[int, Path] = {}
    for path in HELP.glob("*.md"):
        match = re.search(r"_(\d+)$", path.stem)
        if match:
            paths[int(match.group(1))] = path
    expected_active = set(sql_rows) - SQL_EXCLUDED_IDS
    if set(paths) != expected_active or len(paths) != 137:
        raise ValueError("help markdown snapshot does not equal the 137 active SQL records")

    rows: list[dict] = []
    for source_id, path in sorted(paths.items()):
        source_bytes = path.read_bytes()
        text = source_bytes.decode("utf-8")
        frontmatter, _ = parse_frontmatter(text)
        domain, content_kind, claim_type = help_group(source_id)
        usage, route, embedded_routes = current_route(source_id)
        status, payload_status, blockers, approvers, queue_id = inventory_policy(source_id, domain, usage)
        body_urls = list(dict.fromkeys(re.findall(r"https?://[^)\s\"]+", text, re.I)))
        cover = str(frontmatter.get("coverImg") or sql_rows[source_id]["cover"] or "")
        if cover and not cover.startswith("http"):
            cover = f"https://bocang.oss-cn-shenzhen.aliyuncs.com/{cover.lstrip('/')}"
        body_count = len([url for url in body_urls if url != cover])
        rows.append({
            "candidate_id": f"help-{source_id}",
            "source_id": source_id,
            "source_title": sql_rows[source_id]["title"],
            "source_type": "mall_sql_jh_articles+knowledge_base_markdown",
            "source_locator": f"jh_articles.articleId={source_id}",
            "source_path": f"商城系统/帮助文章/{path.name}",
            "source_hash": sha256_bytes(source_bytes),
            "source_category": frontmatter.get("分类", ""),
            "content_domain": domain,
            "content_kind": content_kind,
            "is_show": sql_rows[source_id]["is_show"],
            "data_flag": sql_rows[source_id]["data_flag"],
            "create_time": sql_rows[source_id]["create_time"],
            "current_usage": usage,
            "current_route": route,
            "embedded_routes": embedded_routes,
            "claim_type": claim_type,
            "confirmed_stage": "来源记录存在；后续实施状态待证" if domain == "project" else "来源记录存在；公开表述待签核",
            "unverified_claims": unverified_claims(domain),
            "cover_candidate": cover,
            "body_media_count": body_count,
            "payload_status": payload_status,
            "image_rights_status": "needs_review" if cover or body_count else "not_applicable",
            "inventory_status": status,
            "publication_blockers": blockers,
            "required_approvers": approvers,
            "manual_queue_id": queue_id,
            "last_verified_at": sql_rows[source_id]["create_time"][:10],
        })

    expected = {
        "project": 34,
        "honor": 10,
        "company_dynamic": 21,
        "smart_capability": 6,
        "product_topic": 3,
        "smart_tutorial": 7,
        "ies_asset": 6,
        "video_asset": 5,
        "legacy_template": 45,
    }
    if Counter(row["content_domain"] for row in rows) != expected:
        raise ValueError("help article classification drifted from the approved snapshot")
    return rows


def build_legacy_routes(help_rows: list[dict]) -> list[dict]:
    rows: list[dict] = []
    by_id = {row["source_id"]: row for row in help_rows}
    for source_id in sorted(set(by_id) | SQL_EXCLUDED_IDS):
        item = by_id.get(source_id)
        if source_id in SQL_EXCLUDED_IDS or (item and item["inventory_status"] == "prohibited_legacy"):
            action, status_code, destination = "gone", 410, ""
        elif item and item["current_route"]:
            action, status_code, destination = "redirect", 308, item["current_route"]
        else:
            action, status_code, destination = "not_found", 404, ""
        rows.append({
            "source_id": source_id,
            "action": action,
            "status_code": status_code,
            "destination": destination,
            "legacy_paths": [f"/news/{source_id}", f"/static/news/{source_id}.html"],
        })
    if len(rows) != 151 or any(row["destination"] == "/news" for row in rows):
        raise ValueError("legacy news route map is incomplete or contains a blanket redirect")
    return rows


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_help_csv(rows: list[dict]) -> None:
    fields = list(rows[0])
    with HELP_CSV_OUTPUT.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else value for key, value in row.items()})


def main() -> None:
    verify_external_sources({"help", "mall_sql"})
    sql_rows = load_help_sql()
    help_rows = build_help_inventory(sql_rows)
    legacy_routes = build_legacy_routes(help_rows)
    hard_exclusions = {
        "sql_excluded_help_article_ids": sorted(SQL_EXCLUDED_IDS),
        "prohibited_legacy_help_article_ids": sorted(PROHIBITED_LEGACY_IDS),
        "non_lighting_product_ids": sorted(NON_LIGHTING_PRODUCT_IDS),
        "forbidden_source_tables": ["jh_sys_configs"],
        "forbidden_legacy_patterns": ["WSTMart", "商淘", "客服QQ", "用户QQ群", "旧电话", "旧地址", "支付政策", "物流政策", "旧合作政策"],
    }
    write_json(HELP_JSON_OUTPUT, help_rows)
    write_help_csv(help_rows)
    write_json(EXCLUSIONS_OUTPUT, hard_exclusions)
    write_json(LEGACY_ROUTES_OUTPUT, legacy_routes)
    print(json.dumps({
        "professional_articles_imported": 0,
        "help_articles": len(help_rows),
        "help_categories": Counter(row["content_domain"] for row in help_rows),
        "legacy_routes": len(legacy_routes),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
