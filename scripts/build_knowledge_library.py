from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
KB = Path(os.environ.get("JUHAO_KNOWLEDGE_BASE", "/Users/mac/Documents/juhao数据库/企业知识库"))
HELP = KB / "商城系统" / "帮助文章"
INVENTORY = ROOT / "content" / "governance" / "help-article-inventory.json"
OUTPUT = ROOT / "content" / "runtime" / "knowledge-library.json"

TUTORIAL_METADATA_ONLY_IDS = set(range(173, 180))
CONTENT_STATUS_ORDER = (
    "full_text",
    "summary_only",
    "duration_only",
    "in_progress",
    "metadata_only",
)
DURATION_ONLY_PATTERN = re.compile(r"^\d{1,2}:\d{2}$")
IN_PROGRESS_TEXTS = {"内容整理中"}
CHANNEL_IDS = {
    14, 15, 17, 18, 105, 106, 107, 108, 109,
    141, 142, 149, 150, 168, 172, 188, 192, 197, 205, 224,
}
CHANNEL_TITLE_PATTERN = re.compile(r"经销商|订货会|招商|入驻|供应商|两线.?实体|直购节|集训|渠道")
SMART_TITLE_PATTERN = re.compile(r"智能家居|智慧家|智慧家庭|智能照明|5G多功能模组化智慧路灯")

CATEGORIES = [
    ("company-news", "企业新闻", "品牌动态、企业荣誉与产品资讯"),
    ("engineering-cases", "工程案例", "项目案例、中标与工程阶段记录"),
    ("channel-partners", "招商合作", "经销商、渠道、入驻与合作资料"),
    ("mall-help", "商城帮助", "商城操作、服务、下载与历史规则资料"),
    ("smart-home", "智能家居", "智慧家庭、智能能力与设备教程资料"),
]


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        raise ValueError("markdown is missing frontmatter")
    frontmatter, body = text[4:].split("\n---\n", 1)
    fields: dict[str, str] = {}
    for line in frontmatter.splitlines():
        match = re.match(r"^([A-Za-z0-9_\u4e00-\u9fff]+):\s*(.*)$", line)
        if match:
            fields[match.group(1)] = match.group(2).strip().strip('"\'')
    return fields, body


def redact_legacy_values(value: str) -> str:
    value = re.sub(r"https?://[^\s)\]>]+", "", value, flags=re.I)
    value = re.sub(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b", "历史邮箱已隐藏", value)
    value = re.sub(r"(?:客服QQ|用户QQ群|QQ)\s*[：:]?\s*\d+", "历史客服方式已隐藏", value, flags=re.I)
    value = re.sub(r"(?<!\d)1[3-9]\d(?:[ -]?\d){8}(?!\d)", "历史联系电话已隐藏", value)
    if "地址" in value and re.search(r"(?:省|市|区|县|路|街|大厦|园区|总部)", value):
        return "历史地址已隐藏"
    value = value.replace("400-0760-888", "历史服务电话已隐藏")
    value = re.sub(r"WSTMart|商淘", "旧商城系统", value, flags=re.I)
    value = value.replace("价格：", "价格说明：").replace("价格:", "价格说明:")
    value = value.replace("库存：", "库存说明：").replace("库存:", "库存说明:")
    return value


def clean_inline_markdown(value: str) -> str:
    value = html.unescape(value)
    value = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"<[^>]+>", "", value)
    value = redact_legacy_values(value)
    value = re.sub(r"^[#>\-*+|\s]+", "", value)
    value = re.sub(r"[`*_~]", "", value)
    value = re.sub(r"\s+", " ", value).strip(" |\t")
    return value


def body_paragraphs(body: str, title: str) -> list[str]:
    body = re.sub(r"!\[[^\]]*\]\([^)]*\)", "\n", body)
    paragraphs: list[str] = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line == "---" or line.startswith("**文章分类**:") or line.startswith("**内容简介**:"):
            continue
        cleaned = clean_inline_markdown(line)
        if not cleaned or cleaned == title or not re.search(r"[\w\u4e00-\u9fff]", cleaned):
            continue
        if not paragraphs or paragraphs[-1] != cleaned:
            paragraphs.append(cleaned)
    return paragraphs


def content_status(metadata_only: bool, paragraphs: list[str], description: str) -> str:
    if metadata_only:
        return "metadata_only"
    recorded_text = paragraphs or ([description] if description else [])
    if not recorded_text:
        return "summary_only"
    if all(DURATION_ONLY_PATTERN.fullmatch(paragraph) for paragraph in recorded_text):
        return "duration_only"
    if all(paragraph in IN_PROGRESS_TEXTS for paragraph in recorded_text):
        return "in_progress"
    if not paragraphs:
        return "summary_only"
    return "full_text"


def site_category(item: dict, title: str) -> str:
    source_id = int(item["source_id"])
    domain = item["content_domain"]
    if domain == "project":
        return "engineering-cases"
    if domain in {"smart_capability", "smart_tutorial"} or SMART_TITLE_PATTERN.search(title):
        return "smart-home"
    if source_id in CHANNEL_IDS or CHANNEL_TITLE_PATTERN.search(title):
        return "channel-partners"
    if item["source_category"] != "公司新闻" or domain in {"legacy_template", "ies_asset", "video_asset"}:
        return "mall-help"
    return "company-news"


def source_file(item: dict) -> Path:
    path = KB / item["source_path"]
    root = KB.resolve()
    resolved = path.resolve()
    if not resolved.is_relative_to(root) or not resolved.is_file():
        raise ValueError(f"knowledge source is missing or outside the vault: {item['source_path']}")
    return resolved


def build_library() -> dict:
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    if len(inventory) != 137:
        raise ValueError(f"expected 137 help records, got {len(inventory)}")

    labels = {category_id: label for category_id, label, _ in CATEGORIES}
    articles: list[dict] = []
    for item in sorted(inventory, key=lambda row: int(row["source_id"]), reverse=True):
        path = source_file(item)
        source_bytes = path.read_bytes()
        fields, body = parse_frontmatter(source_bytes.decode("utf-8"))
        source_id = int(item["source_id"])
        title_match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
        title = clean_inline_markdown(title_match.group(1) if title_match else item["source_title"])
        category_id = site_category(item, title)
        description = clean_inline_markdown(fields.get("articleDesc", ""))
        metadata_only = source_id in TUTORIAL_METADATA_ONLY_IDS
        source_paragraphs = [] if metadata_only else body_paragraphs(body, title)
        status = content_status(metadata_only, source_paragraphs, description)
        paragraphs = source_paragraphs or ([description or title] if status != "metadata_only" else [])
        created_at = fields.get("createTime", item.get("create_time", ""))
        articles.append({
            "source_id": source_id,
            "path": f"/knowledge/{source_id}",
            "title": title,
            "description": description or (paragraphs[0] if paragraphs else "原资料仅保留标题和时长，教程文件待补。"),
            "source_category": str(item["source_category"]),
            "site_category": category_id,
            "site_category_label": labels[category_id],
            "created_at": created_at,
            "content_status": status,
            "historical_notice": item["inventory_status"] == "prohibited_legacy",
            "asset_notice": item["payload_status"] != "source_markdown_available",
            "source_locator": item["source_path"],
            "source_sha256": sha256_bytes(source_bytes),
            "paragraphs": paragraphs,
        })

    if len({item["source_id"] for item in articles}) != 137:
        raise ValueError("knowledge source ids are not unique")
    counts = Counter(item["site_category"] for item in articles)
    categories = [
        {"id": category_id, "label": label, "description": description, "count": counts[category_id]}
        for category_id, label, description in CATEGORIES
    ]
    status_counts = Counter(item["content_status"] for item in articles)
    if set(status_counts) - set(CONTENT_STATUS_ORDER):
        raise ValueError("knowledge content status is invalid")
    if {
        item["source_id"]
        for item in articles
        if item["content_status"] == "metadata_only"
    } != TUTORIAL_METADATA_ONLY_IDS:
        raise ValueError("metadata-only tutorials do not match the approved tutorial set")
    totals = {
        "records": len(articles),
        **{status: status_counts[status] for status in CONTENT_STATUS_ORDER},
    }
    if totals["records"] != 137 or sum(totals[status] for status in CONTENT_STATUS_ORDER) != totals["records"]:
        raise ValueError("knowledge content status totals are invalid")
    return {
        "source_scope": "企业知识库/商城系统/帮助文章",
        "totals": totals,
        "categories": categories,
        "articles": articles,
    }


def validate_runtime_library() -> dict:
    if not OUTPUT.is_file():
        raise ValueError("knowledge-library.json is missing")
    runtime = json.loads(OUTPUT.read_text(encoding="utf-8"))
    totals = runtime.get("totals")
    articles = runtime.get("articles")
    categories = runtime.get("categories")
    if not isinstance(articles, list) or len(articles) != 137:
        raise ValueError("knowledge-library.json must contain 137 articles")
    if len({item.get("source_id") for item in articles if isinstance(item, dict)}) != 137:
        raise ValueError("knowledge-library.json source ids are not unique")
    if not isinstance(totals, dict) or set(totals) != {"records", *CONTENT_STATUS_ORDER}:
        raise ValueError("knowledge-library.json totals are invalid")
    status_counts = Counter(
        item.get("content_status")
        for item in articles
        if isinstance(item, dict)
    )
    if set(status_counts) - set(CONTENT_STATUS_ORDER):
        raise ValueError("knowledge-library.json content status is invalid")
    expected_totals = {
        "records": len(articles),
        **{status: status_counts[status] for status in CONTENT_STATUS_ORDER},
    }
    if totals != expected_totals:
        raise ValueError("knowledge-library.json totals do not match its records")
    if not isinstance(categories, list) or {item.get("id") for item in categories if isinstance(item, dict)} != {item[0] for item in CATEGORIES}:
        raise ValueError("knowledge-library.json categories are invalid")
    return runtime


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the private JUHAO knowledge library runtime data.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.write:
        if not KB.is_dir():
            raise SystemExit(f"knowledge base is unavailable: {KB}")
        rendered = json.dumps(build_library(), ensure_ascii=False, indent=2) + "\n"
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(rendered, encoding="utf-8")
        runtime = json.loads(rendered)
    elif KB.is_dir():
        rendered = json.dumps(build_library(), ensure_ascii=False, indent=2) + "\n"
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != rendered:
            raise SystemExit("knowledge-library.json is stale; run scripts/build_knowledge_library.py --write")
        runtime = json.loads(rendered)
    else:
        runtime = validate_runtime_library()
    print(json.dumps(runtime["totals"], ensure_ascii=False))


if __name__ == "__main__":
    main()
