from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
GOVERNANCE_SOURCE = ROOT / "content" / "governance" / "company-news-source.json"
RUNTIME_OUTPUT = ROOT / "content" / "runtime" / "company-news.json"


def runtime_record(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "slug": item["slug"],
        "path": item["path"],
        "title": item["title"],
        "description": item["description"],
        "intro": item["intro"],
        "sections": item["sections"],
        "published": item["published"],
        "source_id": item["source_id"],
        "phase_stage": item["phase_conservative_summary"]["stage"],
        "publication_boundary": item["publication_boundary"],
        "project_stage": item["project_stage"],
        "local_representative_media": item["local_representative_media"],
        "remote_media_count": len(item["remote_media_sources"]),
        "related": item["related"],
    }


def serialized(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the page-safe company-news runtime snapshot.")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    governance = json.loads(GOVERNANCE_SOURCE.read_text(encoding="utf-8"))

    if len(governance) != 8:
        raise ValueError(f"expected 8 company-news records, got {len(governance)}")
    if len({item["source_id"] for item in governance}) != len(governance):
        raise ValueError("company-news source IDs must be unique")
    if sum(len(item["remote_media_sources"]) for item in governance) != 125:
        raise ValueError("expected 125 governed remote-media candidates")

    runtime = [runtime_record(item) for item in governance]
    runtime_text = serialized(runtime)

    if args.check:
        if RUNTIME_OUTPUT.read_text(encoding="utf-8") != runtime_text:
            raise ValueError("company-news runtime snapshot is stale")
        return

    GOVERNANCE_SOURCE.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_OUTPUT.write_text(runtime_text, encoding="utf-8")


if __name__ == "__main__":
    main()
