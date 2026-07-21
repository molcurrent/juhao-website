from __future__ import annotations

import argparse
import json

from product_catalog_v2 import audit_sources


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Read-only audit of the frozen JUHAO product catalog sources."
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Include full category and attribute-name distributions.",
    )
    args = parser.parse_args()

    report, _ = audit_sources()
    if not args.full:
        report["distributions"] = {
            "category_count": len(report["distributions"]["categories"]),
            "top_categories": dict(
                list(report["distributions"]["categories"].items())[:10]
            ),
            "attribute_name_count": len(report["distributions"]["attribute_names"]),
            "top_attribute_names": dict(
                list(report["distributions"]["attribute_names"].items())[:15]
            ),
        }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
