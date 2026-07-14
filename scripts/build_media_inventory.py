from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import struct
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
PROVENANCE = ROOT / "RECON" / "JUHAO_ASSET_PROVENANCE.md"
PRODUCTS_TS = ROOT / "content" / "products.ts"
CATALOG_TS = ROOT / "content" / "catalog.ts"
COMPANY_NEWS_RUNTIME_JSON = ROOT / "content" / "runtime" / "company-news.json"
OUT_JSON = ROOT / "content" / "governance" / "media-inventory.json"
OUT_CSV = ROOT / "content" / "governance" / "media-inventory.csv"
MIRRORS_JSON = ROOT / "content" / "governance" / "media-mirrors.json"
SOURCE_SNAPSHOT_JSON = ROOT / "content" / "governance" / "media-source-snapshot.json"
BATCH_ID = "oss-batch-2026-07-14-current-site-341"
DEFAULT_PACKETS_DIR = Path(
    os.environ.get(
        "JUHAO_CONTENT_PACKETS_DIR",
        "/Users/mac/Documents/Codex/2026-07-13/juhao-website-handoff-md-users-mac/work/content-source-packets",
    )
)
DEFAULT_VERIFIED_AT = os.environ.get("MEDIA_INVENTORY_VERIFIED_AT", "2026-07-14")

FIELDS = [
    "asset_url",
    "local_path",
    "content_route",
    "role",
    "source_type",
    "source_id",
    "source_path",
    "width",
    "height",
    "alt",
    "rights_status",
    "rights_basis",
    "sha256",
    "last_verified_at",
    "publish_allowed",
    "indexable",
    "media_id",
    "authorization_batch_id",
    "normalized_source_url",
    "source_sha256",
    "original_path",
    "variants",
]

PUBLIC_DEFAULTS = {
    "favicon.png": ("site-wide", "site_icon", "钜豪照明网站图标"),
    "brand/juhao-logo-horizontal.svg": ("site-wide", "brand_logo", "钜豪照明横版标志"),
    "brand/juhao-logo-horizontal-white.svg": ("site-wide", "brand_logo", "钜豪照明白色横版标志"),
    "brand/juhao-logo-stacked.svg": ("site-wide", "brand_logo", "钜豪照明竖版标志"),
    "brand/juhao-logo-stacked-white.svg": ("site-wide", "brand_logo", "钜豪照明白色竖版标志"),
    "images/juhao-hero.webp": ("/", "hero", "钜豪照明住宅建筑光环境视觉图"),
    "images/juhao-home.webp": ("/healthy-light", "hero", "钜豪照明家庭健康光环境视觉图"),
    "images/juhao-commercial.webp": ("/solutions/commercial", "hero", "钜豪照明商业空间光环境视觉图"),
    "images/juhao-public.webp": ("/solutions/public", "hero", "钜豪照明公共空间光环境视觉图"),
    "images/juhao-industrial.webp": ("/solutions/industrial", "hero", "钜豪照明工业空间光环境视觉图"),
}

MIRRORS_BY_URL: dict[str, dict[str, Any]] = {}
PUBLISHABLE_SOURCE_TYPES = {"repository_product_catalog", "repository_case_catalog"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_dimensions(path: Path) -> tuple[int | None, int | None]:
    data = path.read_bytes()
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        return struct.unpack(">II", data[16:24])
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP" and len(data) >= 30:
        chunk = data[12:16]
        if chunk == b"VP8 " and data[23:26] == b"\x9d\x01\x2a":
            width, height = struct.unpack("<HH", data[26:30])
            return width & 0x3FFF, height & 0x3FFF
        if chunk == b"VP8X":
            return 1 + int.from_bytes(data[24:27], "little"), 1 + int.from_bytes(data[27:30], "little")
        if chunk == b"VP8L" and len(data) >= 25 and data[20] == 0x2F:
            bits = int.from_bytes(data[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if path.suffix.lower() == ".svg":
        head = data[:4096].decode("utf-8", errors="ignore")
        width_match = re.search(r'\bwidth="([0-9.]+)(?:px|pt)?"', head)
        height_match = re.search(r'\bheight="([0-9.]+)(?:px|pt)?"', head)
        if width_match and height_match:
            return round(float(width_match.group(1))), round(float(height_match.group(1)))
        viewbox = re.search(r'\bviewBox="[^"]*?([0-9.]+)\s+([0-9.]+)"', head)
        if viewbox:
            return round(float(viewbox.group(1))), round(float(viewbox.group(2)))
    return None, None


def provenance_hashes() -> dict[str, str]:
    text = PROVENANCE.read_text(encoding="utf-8")
    return {
        asset: digest
        for asset, digest in re.findall(
            r"\|\s*`(public/[^`]+)`\s*\|[^|]*\|\s*`([a-f0-9]{64})`\s*\|",
            text,
        )
    }


def record(**values: Any) -> dict[str, Any]:
    result: dict[str, Any] = {field: "" for field in FIELDS}
    result.update(values)
    result["publish_allowed"] = bool(result["publish_allowed"])
    result["indexable"] = bool(result["indexable"])
    return result


def normalize_source_url(value: str) -> str:
    return re.sub(r"^http://", "https://", value)


def local_record(
    relative: str,
    route: str,
    role: str,
    alt: str,
    source_type: str,
    source_id: str,
    source_path: str,
    verified_at: str,
    approved_hashes: dict[str, str],
) -> dict[str, Any]:
    public_path = PUBLIC / relative
    repo_path = f"public/{relative}"
    digest = sha256(public_path)
    width, height = image_dimensions(public_path)
    provenance_hash = approved_hashes.get(repo_path)
    approved = provenance_hash == digest
    if approved:
        basis = f"RECON/JUHAO_ASSET_PROVENANCE.md 记录的生成素材 SHA-256 已匹配：{digest}"
    elif provenance_hash:
        basis = f"RECON/JUHAO_ASSET_PROVENANCE.md 哈希不匹配；记录 {provenance_hash}，当前 {digest}"
    else:
        basis = "已纳入 public 本地资产盘点，但审计来源中未找到明确公开使用授权记录"
    return record(
        asset_url=f"/{relative}",
        local_path=repo_path,
        content_route=route,
        role=role,
        source_type=source_type,
        source_id=source_id,
        source_path=source_path,
        width=width,
        height=height,
        alt=alt,
        rights_status="approved" if approved else "needs_review",
        rights_basis=basis,
        sha256=digest,
        last_verified_at=verified_at,
        publish_allowed=approved,
        indexable=False,
        source_sha256=digest,
        original_path=f"/{relative}",
        variants=[],
    )


def remote_record(
    url: str,
    route: str,
    role: str,
    source_type: str,
    source_id: str,
    source_path: str,
    alt: str,
    verified_at: str,
    width: int | None = None,
    height: int | None = None,
    gate: str = "public_media_authorization_not_verified",
) -> dict[str, Any]:
    normalized = normalize_source_url(url)
    mirror = MIRRORS_BY_URL.get(normalized)
    if mirror:
        publish_allowed = source_type in PUBLISHABLE_SOURCE_TYPES
        return record(
            asset_url=url,
            local_path=f"public{mirror['original_path']}",
            content_route=route,
            role=role,
            source_type=source_type,
            source_id=source_id,
            source_path=source_path,
            width=mirror["width"],
            height=mirror["height"],
            alt=alt,
            rights_status="approved",
            rights_basis=f"{BATCH_ID} 批次授权已匹配；内容事实与页面发布仍由独立门禁控制。",
            sha256=mirror["source_sha256"],
            last_verified_at=verified_at,
            publish_allowed=publish_allowed,
            indexable=False,
            media_id=mirror["media_id"],
            authorization_batch_id=BATCH_ID,
            normalized_source_url=normalized,
            source_sha256=mirror["source_sha256"],
            original_path=mirror["original_path"],
            variants=mirror["variants"],
        )
    return record(
        asset_url=url,
        local_path="",
        content_route=route,
        role=role,
        source_type=source_type,
        source_id=source_id,
        source_path=source_path,
        width=width,
        height=height,
        alt=alt,
        rights_status="needs_review",
        rights_basis=f"远程企业 OSS 素材未取得可审计的公开媒体授权；来源门禁：{gate}",
        sha256="",
        last_verified_at=verified_at,
        publish_allowed=False,
        indexable=False,
        normalized_source_url=normalized,
        variants=[],
    )


def public_asset_records(verified_at: str, approved_hashes: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(item for item in PUBLIC.rglob("*") if item.is_file()):
        relative = path.relative_to(PUBLIC).as_posix()
        if relative.startswith(("media/", "og/")):
            continue
        route, role, alt = PUBLIC_DEFAULTS.get(relative, ("unassigned", "unassigned_asset", path.stem))
        rows.append(
            local_record(
                relative,
                route,
                role,
                alt,
                "local_public_asset",
                relative,
                f"public/{relative}",
                verified_at,
                approved_hashes,
            )
        )
    return rows


def product_records(verified_at: str) -> list[dict[str, Any]]:
    products_text = PRODUCTS_TS.read_text(encoding="utf-8")
    import_match = re.search(r'import rawProducts from "(\.[^"]+\.json)"', products_text)
    if not import_match:
        raise ValueError("content/products.ts 未找到产品 JSON 导入")
    product_json = (PRODUCTS_TS.parent / import_match.group(1)).resolve()
    products = json.loads(product_json.read_text(encoding="utf-8"))
    rows: list[dict[str, Any]] = []
    for product in products:
        source_id = str(product["source_id"])
        route = product["seo_slug"]
        title = product["title"]
        source_path = "content/products.ts"
        primary = product.get("primary_image", "")
        if primary:
            rows.append(
                remote_record(
                    primary,
                    route,
                    "product_primary",
                    "repository_product_catalog",
                    source_id,
                    source_path,
                    f"{title}产品主图",
                    verified_at,
                    gate="image_authorization_requires_manual_evidence",
                )
            )
        for index, url in enumerate(product.get("gallery", []), start=1):
            rows.append(
                remote_record(
                    url,
                    route,
                    "product_gallery",
                    "repository_product_catalog",
                    source_id,
                    source_path,
                    f"{title}产品资料图 {index}",
                    verified_at,
                    gate="image_authorization_requires_manual_evidence",
                )
            )
    return rows


def article_media_records(verified_at: str, approved_hashes: dict[str, str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in json.loads(COMPANY_NEWS_RUNTIME_JSON.read_text(encoding="utf-8")):
        media = item["local_representative_media"]
        rows.append(
            local_record(
                media["src"].removeprefix("/"),
                item["path"],
                "article_representative",
                media["alt"],
                "mall_sql_jh_articles",
                str(item["source_id"]),
                "content/governance/company-news-source.json",
                verified_at,
                approved_hashes,
            )
        )
    return rows


def catalog_records(verified_at: str, approved_hashes: dict[str, str]) -> tuple[list[dict[str, Any]], dict[str, str]]:
    text = CATALOG_TS.read_text(encoding="utf-8")
    rows: list[dict[str, Any]] = []
    case_routes: dict[str, str] = {}
    topic_text = text.split("export const caseStudies", 1)[0]
    for line in topic_text.splitlines():
        slug = re.search(r'slug:\s*"([^"]+)"', line)
        title = re.search(r'title:\s*"([^"]+)"', line)
        image = re.search(r'image:\s*"([^"]+)"', line)
        if not (slug and title and image):
            continue
        route = f"/products/{slug.group(1)}"
        url = image.group(1)
        if url.startswith("/"):
            rows.append(
                local_record(
                    url.removeprefix("/"),
                    route,
                    "topic_hero",
                    f"{title.group(1)}专题场景图",
                    "repository_product_topic",
                    slug.group(1),
                    "content/catalog.ts",
                    verified_at,
                    approved_hashes,
                )
            )
        else:
            rows.append(
                remote_record(
                    url,
                    route,
                    "topic_hero",
                    "repository_product_topic",
                    slug.group(1),
                    "content/catalog.ts",
                    f"{title.group(1)}专题场景图",
                    verified_at,
                )
            )

    current_case: dict[str, str] | None = None
    for line in text.splitlines():
        case_match = re.search(
            r'slug:\s*"([^"]+)".*sourceId:\s*"([^"]+)".*title:\s*"([^"]+)".*image:\s*"([^"]+)"',
            line,
        )
        if case_match:
            slug, source_id, title, url = case_match.groups()
            current_case = {"slug": slug, "source_id": source_id, "title": title}
            route = f"/cases/{slug}"
            case_routes[source_id] = route
            rows.append(
                remote_record(
                    url,
                    route,
                    "case_hero",
                    "repository_case_catalog",
                    source_id,
                    "content/catalog.ts",
                    f"{title}项目资料主图",
                    verified_at,
                )
            )
            continue
        image_match = re.search(r'\{\s*src:\s*"([^"]+)"(.*?)alt:\s*"([^"]+)"', line)
        if image_match and current_case:
            url, attributes, alt = image_match.groups()
            width_match = re.search(r'width:\s*(\d+)', attributes)
            height_match = re.search(r'height:\s*(\d+)', attributes)
            rows.append(
                remote_record(
                    url,
                    f"/cases/{current_case['slug']}",
                    "case_evidence",
                    "repository_case_catalog",
                    current_case["source_id"],
                    "content/catalog.ts",
                    alt,
                    verified_at,
                    int(width_match.group(1)) if width_match else None,
                    int(height_match.group(1)) if height_match else None,
                )
            )
    return rows, case_routes


def packet_records(packets_dir: Path, case_routes: dict[str, str], verified_at: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for packet_name, collection_route, type_name in [
        ("cases_4.json", "/cases", "case"),
        ("news_8.json", "/news", "news"),
    ]:
        path = packets_dir / packet_name
        if not path.exists():
            raise FileNotFoundError(f"内容来源包不存在：{path}")
        packet = json.loads(path.read_text(encoding="utf-8"))
        for item in packet["items"]:
            source_id = str(item["source_id"])
            route = case_routes.get(source_id, collection_route) if type_name == "case" else collection_route
            source_path = item["source_path"]
            cover = item.get("cover") or {}
            if cover.get("resolved_source_url"):
                rows.append(
                    remote_record(
                        cover["resolved_source_url"],
                        route,
                        f"{type_name}_source_cover",
                        item["source_type"],
                        source_id,
                        source_path,
                        f"{item['title']}来源封面",
                        verified_at,
                        gate=cover.get("publication_gate", "public_media_authorization_not_verified"),
                    )
                )
            for image in item.get("body_images", []):
                rows.append(
                    remote_record(
                        image["resolved_source_url"],
                        route,
                        f"{type_name}_source_body",
                        item["source_type"],
                        source_id,
                        source_path,
                        f"{item['title']}来源正文资料图 {image['order']}",
                        verified_at,
                        gate=image.get("publication_gate", "public_media_authorization_not_verified"),
                    )
                )
    return rows


def snapshot_records(verified_at: str) -> list[dict[str, Any]]:
    snapshot = json.loads(SOURCE_SNAPSHOT_JSON.read_text(encoding="utf-8"))
    return [
        remote_record(
            item["asset_url"],
            item["content_route"],
            item["role"],
            item["source_type"],
            str(item["source_id"]),
            item["source_path"],
            item["alt"],
            verified_at,
            item.get("width") or None,
            item.get("height") or None,
        )
        for item in snapshot
    ]


def dedupe_and_sort(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    result: list[dict[str, Any]] = []
    for row in rows:
        key = tuple(
            json.dumps(row[field], ensure_ascii=False, sort_keys=True)
            if isinstance(row[field], (list, dict))
            else row[field]
            for field in FIELDS
        )
        if key not in seen:
            seen.add(key)
            result.append(row)
    return sorted(
        result,
        key=lambda item: (
            item["content_route"],
            item["asset_url"],
            item["role"],
            item["source_type"],
            item["source_id"],
        ),
    )


def write_outputs(rows: list[dict[str, Any]]) -> None:
    OUT_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with OUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    **row,
                    "publish_allowed": str(row["publish_allowed"]).lower(),
                    "indexable": str(row["indexable"]).lower(),
                    "variants": json.dumps(row["variants"], ensure_ascii=False),
                }
            )


def main() -> None:
    global MIRRORS_BY_URL
    parser = argparse.ArgumentParser(description="Build JUHAO auditable media inventory without downloading remote files.")
    parser.add_argument("--packets-dir", type=Path, default=DEFAULT_PACKETS_DIR)
    parser.add_argument("--verified-at", default=DEFAULT_VERIFIED_AT)
    args = parser.parse_args()

    if MIRRORS_JSON.exists():
        mirrors = json.loads(MIRRORS_JSON.read_text(encoding="utf-8"))
        MIRRORS_BY_URL = {item["source_url"]: item for item in mirrors}

    approved_hashes = provenance_hashes()
    if SOURCE_SNAPSHOT_JSON.exists():
        governed_remote = snapshot_records(args.verified_at)
    else:
        catalog, case_routes = catalog_records(args.verified_at, approved_hashes)
        governed_remote = (
            product_records(args.verified_at)
            + catalog
            + packet_records(args.packets_dir, case_routes, args.verified_at)
        )
    rows = dedupe_and_sort(
        public_asset_records(args.verified_at, approved_hashes)
        + article_media_records(args.verified_at, approved_hashes)
        + governed_remote
    )
    write_outputs(rows)
    print(
        json.dumps(
            {
                "records": len(rows),
                "approved": sum(item["rights_status"] == "approved" for item in rows),
                "needs_review": sum(item["rights_status"] == "needs_review" for item in rows),
                "publish_allowed": sum(item["publish_allowed"] for item in rows),
                "indexable": sum(item["indexable"] for item in rows),
                "remote": sum(item["asset_url"].startswith(("http://", "https://")) for item in rows),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
