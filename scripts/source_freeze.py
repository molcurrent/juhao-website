from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
GOVERNANCE = ROOT / "content" / "governance"
RUNTIME = ROOT / "content" / "runtime"
FREEZE_PATH = GOVERNANCE / "source-freeze.json"
KB = Path(os.environ.get("JUHAO_KNOWLEDGE_BASE", "/Users/mac/Documents/juhao数据库/企业知识库"))
SQL_SOURCE = Path(os.environ.get("JUHAO_MALL_SQL", "/Users/mac/Documents/juhao数据库/juhao_mall_2026-07-10_02-41-52_mysql_data.sql"))

ARTIFACTS = [
    "content/governance/company-news-source.json",
    "content/governance/content-ledger.csv",
    "content/governance/content-ledger.json",
    "content/governance/content-media-assignments.json",
    "content/governance/hard-exclusions.json",
    "content/governance/help-article-inventory.csv",
    "content/governance/help-article-inventory.json",
    "content/governance/manual-approval-queue.csv",
    "content/governance/media-authorization-batches.json",
    "content/governance/media-inventory.csv",
    "content/governance/media-inventory.json",
    "content/governance/media-mirrors.json",
    "content/governance/media-source-snapshot.json",
    "content/governance/product-candidates.json",
    "content/governance/published-products.json",
    "content/governance/quality-report.md",
    "content/governance/route-og.json",
    "content/governance/runtime-media.json",
    "content/runtime/company-news.json",
    "content/runtime/legacy-news-routes.json",
    "content/runtime/media-rewrite-report.json",
    "content/runtime/publication-ledger.json",
    "content/runtime/published-products.json",
]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(relative: str):
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def source_rows(records: Iterable[dict], path_key: str, hash_key: str) -> list[dict[str, str]]:
    return sorted(
        ({"path": str(item[path_key]), "sha256": str(item[hash_key])} for item in records),
        key=lambda item: item["path"],
    )


def build_snapshot() -> dict:
    help_articles = read_json("content/governance/help-article-inventory.json")
    products = read_json("content/governance/product-candidates.json")
    ledger = read_json("content/governance/content-ledger.json")
    company_news = read_json("content/governance/company-news-source.json")
    mirrors = read_json("content/governance/media-mirrors.json")
    topic_rows = [item for item in ledger if item["content_type"] == "产品专题"]
    sql_hashes = {item["source_sql_sha256"] for item in company_news}
    if len(sql_hashes) != 1:
        raise ValueError("企业资讯 SQL 快照哈希不唯一")

    return {
        "batch_id": "content-freeze-2026-07-14-juhao-only",
        "frozen_at": "2026-07-14",
        "content_policy": {
            "scope": "juhao_only",
            "professional_article_import": "disabled",
            "removed_professional_article_routes": 33,
        },
        "mall_sql": {
            "filename": "juhao_mall_2026-07-10_02-41-52_mysql_data.sql",
            "sha256": next(iter(sql_hashes)),
        },
        "help_sources": source_rows(help_articles, "source_path", "source_hash"),
        "product_sources": source_rows(products, "source_file", "source_hash"),
        "topic_sources": source_rows(topic_rows, "source_locator", "source_sha256"),
        "company_news_sources": sorted(
            ({"source_id": item["source_id"], "sha256": item["source_sql_sha256"]} for item in company_news),
            key=lambda item: item["source_id"],
        ),
        "media_objects": sorted(
            ({"source_url": item["source_url"], "sha256": item["source_sha256"]} for item in mirrors),
            key=lambda item: item["source_url"],
        ),
        "artifact_sha256": {relative: sha256_file(ROOT / relative) for relative in ARTIFACTS},
    }


def verify_external_sources(groups: set[str] | None = None) -> dict[str, int | str]:
    if not FREEZE_PATH.exists():
        return {"status": "freeze_not_created", "checked": 0}
    frozen = json.loads(FREEZE_PATH.read_text(encoding="utf-8"))
    selected = groups or {"help", "products", "topics", "mall_sql"}
    checked = 0

    if "mall_sql" in selected and SQL_SOURCE.exists():
        if sha256_file(SQL_SOURCE) != frozen["mall_sql"]["sha256"]:
            raise ValueError("商城 SQL 已变化；停止吸收，请建立新的内容冻结批次")
        checked += 1

    if KB.exists():
        mapping = {
            "help": "help_sources",
            "products": "product_sources",
            "topics": "topic_sources",
        }
        root = KB.resolve()
        for group, key in mapping.items():
            if group not in selected:
                continue
            for item in frozen[key]:
                path = (KB / item["path"]).resolve()
                if not path.is_relative_to(root) or not path.is_file():
                    raise ValueError(f"冻结来源文件缺失或越界：{item['path']}")
                if sha256_file(path) != item["sha256"]:
                    raise ValueError(f"来源文件已变化；停止吸收并建立新批次：{item['path']}")
                checked += 1

    return {"status": "verified" if checked else "external_sources_not_available", "checked": checked}


def verify_media_files() -> int:
    mirrors = read_json("content/governance/media-mirrors.json")
    checked = 0
    for mirror in mirrors:
        original = ROOT / "public" / mirror["original_path"].lstrip("/")
        if not original.is_file() or sha256_file(original) != mirror["source_sha256"]:
            raise ValueError(f"冻结媒体原件缺失或哈希变化：{mirror['source_url']}")
        checked += 1
    return checked


def check_snapshot() -> dict:
    if not FREEZE_PATH.exists():
        raise ValueError("缺少 source-freeze.json；不得在未冻结来源的情况下构建")
    frozen = json.loads(FREEZE_PATH.read_text(encoding="utf-8"))
    current = build_snapshot()
    if current != frozen:
        changed = [key for key in current if current.get(key) != frozen.get(key)]
        raise ValueError(f"治理快照已变化；停止构建并建立新批次：{', '.join(changed)}")
    external = verify_external_sources()
    return {
        "batch_id": frozen["batch_id"],
        "professional_article_import": frozen["content_policy"]["professional_article_import"],
        "help_sources": len(frozen["help_sources"]),
        "product_sources": len(frozen["product_sources"]),
        "topic_sources": len(frozen["topic_sources"]),
        "media_objects": verify_media_files(),
        "external_check": external,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Freeze or verify JUHAO source snapshots.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true", help="Explicitly write a reviewed freeze batch.")
    group.add_argument("--check", action="store_true", help="Verify committed artifacts and available external sources.")
    args = parser.parse_args()

    if args.write:
        snapshot = build_snapshot()
        FREEZE_PATH.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        result = {"written": str(FREEZE_PATH.relative_to(ROOT)), **check_snapshot()}
    else:
        result = check_snapshot()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
