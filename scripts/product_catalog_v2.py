from __future__ import annotations

import csv
import hashlib
import io
import json
import os
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit


SNAPSHOT_DATE = "2026-07-16"
DATA_ROOT = Path(os.environ.get("JUHAO_DATA_ROOT", "/Users/mac/Documents/juhao数据库"))
KB_ROOT = DATA_ROOT / "企业知识库"
PRODUCT_DIR = KB_ROOT / "商城系统" / "商品说明"
IOT_PRODUCT_DIR = KB_ROOT / "物联网系统" / "产品配置"
MALL_SQL = DATA_ROOT / "juhao_mall_2026-07-16_02-41-53_mysql_data.sql"
IOT_SQL = DATA_ROOT / "bocang_2026-07-16_02-30-02_mysql_data.sql"
IOT_FILTERED_SQL = DATA_ROOT / "bocang_filtered_2026-07-16.sql"
SAMPLE_SIZE = 120
FULL_GOVERNANCE_FAMILY_SHARD_SIZE = 100
FULL_PRIVATE_RUNTIME_FAMILY_SHARD_SIZE = 100
PUBLIC_CATALOG_ROUTE_PREFIX = "/products/catalog/"
WEB_CATALOG_EXCLUDED_SOURCE_IDS = {
    "4014",
    "4019",
    "4020",
    "4021",
    "5181",
    "11702",
    "11703",
}
CATALOG_IMAGE_ORIGIN = "https://bocang.oss-cn-shenzhen.aliyuncs.com"
CATALOG_IMAGE_PATH_PREFIX = "/upload/"

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.S)
HEADING_RE = re.compile(r"^# 商品说明[：:]\s*(.+?)\s*$", re.M)
IMAGE_RE = re.compile(r"!\[[^\]]*]\((https?://[^)\s]+)\)")
MARKDOWN_IMAGE_RE = re.compile(r"!\[([^\]]*)]\(([^)\r\n]+)\)")
UNDEFINED_SPEC_RE = re.compile(r"^undefined(?:-\d+(?:\.\d+)?)?$", re.I)
MODEL_PREFIX_RE = re.compile(r"^([A-Za-z0-9]+(?:[-+*/.][A-Za-z0-9]+)*)")
EXPLICIT_SERIES_RE = re.compile(r"^([^，,。；;\s]{2,18}?系列)")
SOURCE_SERIES_RE = re.compile(r"([^，,。；;\s]{2,18}?系列)")
HTML_ENTITY_RE = re.compile(r"&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);", re.I)

FACET_KEY_MAP = {
    "空间": "spaces",
    "类型": "types",
    "材质": "materials",
    "风格": "styles",
    "面积": "areas",
    "光源类型": "light_sources",
    "颜色工艺": "finishes",
    "发光颜色": "light_colors",
    "功率(W)": "wattages",
    "电压(V)": "voltages",
    "尺寸": "dimensions",
    "色温": "cct",
    "显色指数": "cri",
    "显指": "cri",
    "光束角": "beam_angles",
    "防护等级": "ip_ratings",
    "IP等级": "ip_ratings",
    "协议": "protocols",
    "通信协议": "protocols",
}

PRIVATE_RUNTIME_FORBIDDEN_KEYS = {
    "user",
    "user_id",
    "address",
    "order",
    "payment",
    "contact",
    "phone",
    "device_instance",
    "device_id",
    "mqtt_log",
    "system_log",
    "verification_code",
    "password",
    "secret",
    "token",
}

REVIEW_ALLOWED_ACTIONS = {
    "confirm_auto_family": {"confirm_family", "split_family"},
    "merge_candidate": {"merge_candidate", "keep_separate"},
    "category_anomaly": {"recategorize", "exclude_with_disposition"},
}
DIRECTLY_EFFECTIVE_REVIEW_ACTIONS = {"confirm_family", "keep_separate"}
REVIEW_ALLOWED_DISPOSITIONS = {
    "duplicate_source_governance_only",
    "insufficient_product_evidence_hold",
    "non_lighting_governance_only",
    "out_of_scope_product_hold",
}


def external_catalog_sources_available() -> bool:
    return (
        PRODUCT_DIR.is_dir()
        and IOT_PRODUCT_DIR.is_dir()
        and MALL_SQL.is_file()
        and IOT_SQL.is_file()
        and IOT_FILTERED_SQL.is_file()
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def stable_json_sha256(value: object) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def aggregate_hash(paths: list[Path], root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(str(path.relative_to(root)).encode("utf-8"))
        digest.update(b"\0")
        digest.update(bytes.fromhex(sha256_file(path)))
    return digest.hexdigest()


def frontmatter_value(text: str, key: str) -> str:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return ""
    field = re.search(rf"^{re.escape(key)}:\s*(.*?)\s*$", match.group(1), re.M)
    return field.group(1).strip().strip("\"'") if field else ""


def section(text: str, heading: str) -> str:
    marker = f"### {heading}"
    if marker not in text:
        return ""
    tail = text.split(marker, 1)[1]
    return re.split(r"\n### |\n---\s*$", tail, maxsplit=1, flags=re.M)[0]


def markdown_table(section_text: str) -> tuple[list[str], list[list[str]]]:
    lines = [line.strip() for line in section_text.splitlines() if line.strip().startswith("|")]
    if len(lines) < 2:
        return [], []

    def cells(line: str) -> list[str]:
        return [cell.strip() for cell in line.strip("|").split("|")]

    headers = cells(lines[0])
    rows = [cells(line) for line in lines[2:]]
    return headers, [row for row in rows if len(row) == len(headers)]


def local_image_evidence(note_path: Path, text: str) -> list[dict]:
    evidence = []
    product_root = PRODUCT_DIR.resolve()
    for match in MARKDOWN_IMAGE_RE.finditer(text):
        alt_text = match.group(1).strip()
        target = match.group(2).strip()
        if target.startswith("<") and target.endswith(">"):
            target = target[1:-1].strip()
        parsed = urlsplit(target)
        if (
            not target
            or parsed.scheme
            or parsed.netloc
            or target.startswith(("/", "#"))
        ):
            continue
        relative_path = Path(target)
        if relative_path.is_absolute() or ".." in relative_path.parts:
            continue
        resolved = (note_path.parent / relative_path).resolve()
        try:
            catalog_relative_path = resolved.relative_to(product_root)
        except ValueError:
            continue
        exists = resolved.is_file()
        note_relative_path = relative_path.as_posix()
        evidence.append(
            {
                "role": "primary" if alt_text == "主图" else "detail",
                "note_relative_path": note_relative_path,
                "catalog_relative_path": catalog_relative_path.as_posix(),
                "relative_path_sha256": hashlib.sha256(
                    note_relative_path.encode("utf-8")
                ).hexdigest(),
                "exists": exists,
                "bytes": resolved.stat().st_size if exists else None,
                "sha256": sha256_file(resolved) if exists else None,
            }
        )
    return evidence


def reference_image_fingerprint(images: list[str]) -> str | None:
    """Return a stable identity for the complete source reference-image set.

    A single reused scene image is not product identity.  The product-family
    rule deliberately requires the complete non-empty detail-image set to
    match exactly; presentation order remains on the source record.
    """
    complete_set = sorted(set(images))
    if not complete_set:
        return None
    return hashlib.sha256("\n".join(complete_set).encode("utf-8")).hexdigest()


def parse_product_note(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8")
    source_id = frontmatter_value(text, "ID")
    title_match = HEADING_RE.search(text)
    if not source_id or not title_match:
        return None

    attributes_headers, attribute_rows = markdown_table(section(text, "商品属性参数"))
    attributes = {
        row[0]: row[1]
        for row in attribute_rows
        if len(attributes_headers) >= 2 and row[0] and row[1]
    }

    spec_headers, spec_rows = markdown_table(section(text, "规格库存与售价定价"))
    normalized_spec_headers = [header.replace("体戏", "体积") for header in spec_headers]
    specs = []
    for row_index, row in enumerate(spec_rows, start=1):
        raw = dict(zip(normalized_spec_headers, row))
        raw_code = row[0].strip() if row else ""
        specs.append(
            {
                "source_spec_code": None if UNDEFINED_SPEC_RE.fullmatch(raw_code) else raw_code or None,
                "source_row": row_index,
                "normalization": "undefined_spec_code_removed"
                if UNDEFINED_SPEC_RE.fullmatch(raw_code)
                else "unchanged",
                "has_snapshot_price": bool(raw.get("规格价 (元)")),
                "has_snapshot_stock": bool(raw.get("库存数量")),
                "weight": raw.get("重量 (kg)") or None,
                "volume": raw.get("体积 (m³)") or None,
            }
        )

    all_images = IMAGE_RE.findall(text)
    detail_images = IMAGE_RE.findall(section(text, "商品详情介绍"))
    source_type = "local_supplement" if path.name.endswith("_本地补充.md") else "mall_sql"
    relative_path = str(path.relative_to(KB_ROOT))
    title = title_match.group(1).strip()
    detail_fingerprint = (
        hashlib.sha256("\n".join(detail_images).encode("utf-8")).hexdigest()
        if detail_images
        else None
    )
    local_media = local_image_evidence(path, text)
    return {
        "source_type": source_type,
        "source_id": source_id,
        "display_id": frontmatter_value(text, "商品编号") or source_id,
        "compound_key": f"{source_type}:{source_id}",
        "source_path": relative_path,
        "source_sha256": sha256_file(path),
        "title": title,
        "category": frontmatter_value(text, "分类") or "待复核",
        "attributes": attributes,
        "specs": specs,
        "primary_image": all_images[0] if all_images else None,
        "detail_images": detail_images,
        "detail_fingerprint": detail_fingerprint,
        "reference_image_fingerprint": reference_image_fingerprint(
            detail_images
        ),
        "has_volume_typo": "体戏 (m³)" in text,
        "local_media_evidence": local_media,
    }


def load_product_notes() -> tuple[list[dict], list[Path]]:
    all_notes = sorted(PRODUCT_DIR.glob("*.md"))
    records = []
    for path in all_notes:
        record = parse_product_note(path)
        if record:
            records.append(record)
    return records, all_notes


def source_metadata(path: Path, include_hash: bool = True) -> dict:
    stat = path.stat()
    result = {
        "path": str(path),
        "bytes": stat.st_size,
        "modified_ns": stat.st_mtime_ns,
    }
    if include_hash:
        result["sha256"] = sha256_file(path)
    else:
        result["sha256"] = None
        result["hash_status"] = "omitted_large_excluded_source"
    return result


def audit_sources() -> tuple[dict, list[dict]]:
    records, all_product_notes = load_product_notes()
    iot_notes = sorted(IOT_PRODUCT_DIR.glob("*.md"))
    compound_keys = [record["compound_key"] for record in records]
    title_counts = Counter(record["title"] for record in records)
    detail_counts = Counter(
        record["detail_fingerprint"]
        for record in records
        if record["detail_fingerprint"]
    )
    reference_image_counts = Counter(
        record["reference_image_fingerprint"]
        for record in records
        if record["reference_image_fingerprint"]
    )
    category_counts = Counter(record["category"] for record in records)
    attribute_counts = Counter(
        key
        for record in records
        for key in record["attributes"]
    )

    report = {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "source_contract": {
            "primary_key": "source_type + source_id",
            "source_of_truth": "read_only",
            "product_body_policy": "reference_source_notes_do_not_create_parallel_authoring_copy",
        },
        "sources": {
            "mall_sql": source_metadata(MALL_SQL),
            "knowledge_base_product_notes": {
                "path": str(PRODUCT_DIR),
                "all_markdown_files": len(all_product_notes),
                "product_records": len(records),
                "non_product_index_files": len(all_product_notes) - len(records),
                "aggregate_sha256": aggregate_hash(all_product_notes, PRODUCT_DIR),
            },
            "local_supplements": {
                "count": sum(record["source_type"] == "local_supplement" for record in records),
                "compound_keys": [
                    record["compound_key"]
                    for record in records
                    if record["source_type"] == "local_supplement"
                ],
            },
            "iot_boundary": {
                "web_catalog_import": "excluded",
                "product_note_count": len(iot_notes),
                "notes_aggregate_sha256": aggregate_hash(iot_notes, IOT_PRODUCT_DIR),
                "master_sql": source_metadata(IOT_SQL, include_hash=False),
                "filtered_dictionary_sql": source_metadata(IOT_FILTERED_SQL),
                "allowed_future_fields": [
                    "product_type",
                    "protocol",
                    "capability_name",
                    "deidentified_scene_template",
                ],
                "forbidden_fields": [
                    "user",
                    "address",
                    "order",
                    "payment",
                    "contact",
                    "device_instance",
                    "mqtt_log",
                    "system_log",
                    "verification_code",
                    "secret",
                ],
            },
        },
        "quality": {
            "compound_key_duplicates": len(compound_keys) - len(set(compound_keys)),
            "missing_title": sum(not record["title"] for record in records),
            "missing_category": sum(record["category"] == "待复核" for record in records),
            "missing_primary_image": sum(not record["primary_image"] for record in records),
            "missing_detail_images": sum(not record["detail_images"] for record in records),
            "missing_attributes": sum(not record["attributes"] for record in records),
            "undefined_spec_rows": sum(
                spec["normalization"] == "undefined_spec_code_removed"
                for record in records
                for spec in record["specs"]
            ),
            "volume_header_typo_notes": sum(record["has_volume_typo"] for record in records),
            "duplicate_title_groups": sum(count > 1 for count in title_counts.values()),
            "shared_detail_fingerprint_groups": sum(count > 1 for count in detail_counts.values()),
            "shared_reference_image_set_groups": sum(
                count > 1 for count in reference_image_counts.values()
            ),
        },
        "distributions": {
            "categories": dict(category_counts.most_common()),
            "attribute_names": dict(attribute_counts.most_common()),
        },
    }
    return report, records


def split_facet_values(value: str) -> list[str]:
    return list(
        dict.fromkeys(
            part.strip()
            for part in re.split(r"[,，、]", value)
            if part.strip()
        )
    )


def normalized_facets(record: dict) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for source_key, value in record["attributes"].items():
        if target_key := FACET_KEY_MAP.get(source_key):
            result[target_key] = split_facet_values(value)
    return result


def model_signature(title: str) -> str | None:
    normalized = title.replace("×", "*").strip()
    if series_match := EXPLICIT_SERIES_RE.match(normalized):
        return series_match.group(1)
    match = MODEL_PREFIX_RE.match(normalized)
    if not match:
        return None
    token = match.group(1).strip("-")
    parts = token.split("-")
    if (
        len(parts) >= 2
        and any(character.isdigit() for character in parts[-2])
        and (
            any(character.isdigit() for character in parts[-1])
            or any(character in parts[-1].upper() for character in ("W", "+", "*"))
        )
    ):
        token = "-".join(parts[:-1])
    return token if len(token) >= 2 else None


def source_model_label(title: str) -> str | None:
    normalized = title.replace("×", "*").strip()
    match = MODEL_PREFIX_RE.match(normalized)
    if not match:
        return None
    token = match.group(1).strip("-")
    if (
        len(token) < 2
        or not any(character.isalpha() for character in token)
        or not any(character.isdigit() for character in token)
    ):
        return None
    return token


def source_series_label(title: str) -> str | None:
    match = SOURCE_SERIES_RE.search(title.strip())
    return match.group(1) if match else None


def safe_runtime_facet_value(value: str) -> str | None:
    normalized = re.sub(r"\s+", " ", value).strip()
    if (
        not normalized
        or any(ord(character) < 32 or ord(character) == 127 for character in normalized)
        or "<" in normalized
        or ">" in normalized
        or HTML_ENTITY_RE.search(normalized)
    ):
        return None
    return normalized


def runtime_facets(family: dict) -> dict[str, list[str]]:
    output: dict[str, list[str]] = {}
    for facet, values in sorted(family["facets"].items()):
        safe_values = list(
            dict.fromkeys(
                safe
                for value in values
                if (safe := safe_runtime_facet_value(value))
            )
        )
        if safe_values:
            output[facet] = safe_values
    return output


def record_quality_score(record: dict) -> int:
    return (
        (24 if record["primary_image"] else 0)
        + min(len(record["detail_images"]), 12) * 2
        + min(len(record["attributes"]), 10) * 4
        + (8 if record["specs"] else 0)
    )


def quality_flags(record: dict) -> list[str]:
    flags = []
    if not record["primary_image"]:
        flags.append("primary_image_missing")
    if not record["detail_images"]:
        flags.append("detail_images_missing")
    if not record["attributes"]:
        flags.append("attributes_missing")
    if any(
        spec["normalization"] == "undefined_spec_code_removed"
        for spec in record["specs"]
    ):
        flags.append("undefined_spec_codes_normalized_to_null")
    if record["has_volume_typo"]:
        flags.append("volume_header_typo_normalized")
    return flags


def variant_dimensions(record: dict) -> dict:
    dimensions: dict[str, dict[str, str]] = {}
    attributes = record["attributes"]
    direct_fields = {
        "dimensions": ("尺寸",),
        "wattage": ("功率(W)",),
        "cct": ("色温",),
        "cri": ("显色指数", "显指"),
        "beam_angle": ("光束角",),
        "ip_rating": ("防护等级", "IP等级"),
        "protocol": ("协议", "通信协议"),
        "finish_color": ("颜色工艺", "发光颜色"),
    }
    for target, source_keys in direct_fields.items():
        for source_key in source_keys:
            if value := attributes.get(source_key):
                dimensions[target] = {
                    "value": value,
                    "evidence": f"source_attribute:{source_key}",
                }
                break
    if "wattage" not in dimensions:
        if match := re.search(r"(?<!\d)(\d+(?:\.\d+)?)\s*W\b", record["title"], re.I):
            dimensions["wattage"] = {
                "value": f"{match.group(1)}W",
                "evidence": "title_literal",
            }
    return dimensions


def family_title(members: list[dict], category: str) -> str:
    signatures = Counter(
        signature
        for member in members
        if (signature := model_signature(member["title"]))
    )
    if signatures:
        signature, count = signatures.most_common(1)[0]
        if count >= 2:
            return (
                signature
                if signature.endswith("系列")
                else f"{signature} {category}系列"
            )
    return min(members, key=lambda member: (len(member["title"]), member["title"]))[
        "title"
    ]


def assemble_family(
    members: list[dict],
    family_id: str,
    grouping_status: str,
    grouping_evidence: str,
    applied_decision_ids: list[str] | None = None,
    allow_category_conflict: bool = False,
) -> dict:
    sorted_members = sorted(
        members,
        key=lambda member: member["compound_key"],
    )
    categories = {member["category"] for member in sorted_members}
    source_categories = sorted(categories)
    category_conflict = len(source_categories) != 1
    if category_conflict and not allow_category_conflict:
        raise RuntimeError(
            f"catalog v2 family spans categories: {family_id}"
        )
    category = source_categories[0] if not category_conflict else "待复核"
    representative = max(
        sorted_members,
        key=lambda member: (
            record_quality_score(member),
            member["compound_key"],
        ),
    )
    representative_source_id = str(
        representative.get("source_id")
        or representative.get("display_id")
        or representative["compound_key"].split(":", 1)[-1]
    )
    representative_display_id = str(
        representative.get("display_id") or representative_source_id
    )
    family_facets: dict[str, list[str]] = defaultdict(list)
    for member in sorted_members:
        for facet, values in normalized_facets(member).items():
            family_facets[facet].extend(values)
    family_facets = {
        facet: list(dict.fromkeys(values))[:16]
        for facet, values in sorted(family_facets.items())
    }
    family = {
        "family_id": family_id,
        "canonical_slug": representative_display_id,
        "canonical_source_key": representative["compound_key"],
        "canonical_source_id": representative_source_id,
        "topic_slug": None,
        "planned_canonical_route": None,
        "route_plan_state": (
            "pending_category_selection"
            if category_conflict
            else "pending_topic_assignment"
        ),
        "route_plan_evidence": (
            "same_complete_reference_image_set_category_requires_owner_selection"
            if category_conflict
            else "topic_taxonomy_requires_human_review"
        ),
        "title": family_title(
            sorted_members,
            category if not category_conflict else "跨分类",
        ),
        "category": category,
        "source_categories": source_categories,
        "category_state": (
            "pending_owner_selection"
            if category_conflict
            else "source_category_unambiguous"
        ),
        "grouping_status": grouping_status,
        "grouping_evidence": grouping_evidence,
        "member_count": len(sorted_members),
        "representative": representative,
        "representative_score": record_quality_score(representative),
        "facets": family_facets,
        "members": sorted_members,
    }
    if applied_decision_ids:
        family["applied_decision_ids"] = sorted(applied_decision_ids)
    return family


def family_model_sha256(families: list[dict]) -> str:
    return stable_json_sha256(
        [
            {
                "family_id": family["family_id"],
                "category": family["category"],
                "source_categories": family["source_categories"],
                "category_state": family["category_state"],
                "member_keys": sorted(
                    member["compound_key"] for member in family["members"]
                ),
            }
            for family in sorted(
                families,
                key=lambda family: family["family_id"],
            )
        ]
    )


def build_families(records: list[dict]) -> tuple[list[dict], dict[str, str]]:
    strong_group_counts = Counter(
        record["reference_image_fingerprint"]
        for record in records
        if record["reference_image_fingerprint"]
    )
    categories_by_reference_image: dict[str, set[str]] = defaultdict(set)
    for record in records:
        if reference_key := record["reference_image_fingerprint"]:
            categories_by_reference_image[reference_key].add(
                record["category"]
            )
    grouped: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        reference_key = record["reference_image_fingerprint"]
        if (
            reference_key
            and strong_group_counts[reference_key] > 1
        ):
            if len(categories_by_reference_image[reference_key]) == 1:
                # Preserve established family IDs when the new rule does not
                # change membership; only cross-category clusters migrate.
                grouping_key = (
                    f"shared_detail:{record['category']}:"
                    f"{record['detail_fingerprint']}"
                )
            else:
                grouping_key = (
                    "shared_reference_image_set_cross_category:"
                    f"{reference_key}"
                )
        else:
            grouping_key = f"singleton:{record['compound_key']}"
        grouped[grouping_key].append(record)

    families = []
    member_to_family: dict[str, str] = {}
    for grouping_key, members in sorted(grouped.items()):
        digest = hashlib.sha256(grouping_key.encode("utf-8")).hexdigest()[:12]
        family_id = f"family-{digest}"
        for member in members:
            member_to_family[member["compound_key"]] = family_id
        grouping_status = (
            "auto_merged_shared_reference_image_set"
            if len(members) > 1
            else "singleton_unreviewed"
        )
        families.append(
            assemble_family(
                members,
                family_id,
                grouping_status,
                (
                    "exact_complete_reference_image_set"
                    if len(members) > 1
                    else "no_strong_family_evidence"
                ),
                allow_category_conflict=len(
                    {member["category"] for member in members}
                ) > 1,
            )
        )
    return sorted(families, key=lambda family: family["family_id"]), member_to_family


def review_candidate(
    row: dict,
    review_kind: str,
    source_snapshot_sha256: str,
) -> dict:
    candidate_payload = {
        "review_id": row["review_id"],
        "review_kind": review_kind,
        "evidence_type": row["evidence_type"],
        "model_signature": row["model_signature"],
        "category": row["category"],
        "member_keys": sorted(row["member_keys"].split("|")),
        "auto_family_id": row["auto_family_id"],
        "source_snapshot_sha256": source_snapshot_sha256,
    }
    return {
        **row,
        "review_kind": review_kind,
        "candidate_sha256": stable_json_sha256(candidate_payload),
        "source_snapshot_sha256": source_snapshot_sha256,
        "machine_state": "pending",
    }


def build_review_rows(
    families: list[dict],
    source_snapshot_sha256: str,
) -> list[dict]:
    rows = []
    for family in families:
        if family["member_count"] < 2:
            continue
        rows.append(
            review_candidate(
                {
                    "review_id": family["family_id"],
                    "decision_status": "needs_human_confirmation",
                    "evidence_type": family["grouping_evidence"],
                    "model_signature": model_signature(family["title"]) or "",
                    "category": family["category"],
                    "member_count": family["member_count"],
                    "member_keys": "|".join(
                        member["compound_key"] for member in family["members"]
                    ),
                    "suggested_action": "confirm_auto_family_or_split",
                    "auto_family_id": family["family_id"],
                },
                "confirm_auto_family",
                source_snapshot_sha256,
            )
        )

    model_groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    family_by_member = {
        member["compound_key"]: family["family_id"]
        for family in families
        for member in family["members"]
    }
    for family in families:
        for member in family["members"]:
            if signature := model_signature(member["title"]):
                model_groups[(member["category"], signature)].append(member)
    for (category, signature), members in sorted(model_groups.items()):
        family_ids = {
            family_by_member[member["compound_key"]]
            for member in members
        }
        if len(members) < 2 or len(family_ids) < 2:
            continue
        review_digest = hashlib.sha256(
            f"{category}:{signature}".encode("utf-8")
        ).hexdigest()[:12]
        rows.append(
            review_candidate(
                {
                    "review_id": f"candidate-{review_digest}",
                    "decision_status": "manual_review_required",
                    "evidence_type": "normalized_model_signature_only",
                    "model_signature": signature,
                    "category": category,
                    "member_count": len(members),
                    "member_keys": "|".join(
                        member["compound_key"]
                        for member in sorted(
                            members, key=lambda item: item["compound_key"]
                        )
                    ),
                    "suggested_action": "merge_only_after_product_owner_review",
                    "auto_family_id": "",
                },
                "merge_candidate",
                source_snapshot_sha256,
            )
        )
    return sorted(rows, key=lambda row: row["review_id"])


def published_product_routes(root: Path) -> list[dict]:
    published_path = root / "content" / "runtime" / "published-products.json"
    published = json.loads(published_path.read_text(encoding="utf-8"))
    return [
        {
            "source_key": f"mall_sql:{item['source_id']}",
            "source_id": str(item["source_id"]),
            "topic_slug": item["topic_slug"],
            "legacy_route": f"/products/{item['topic_slug']}/{item['source_id']}",
        }
        for item in published
    ]


def plan_family_routes(
    root: Path,
    families: list[dict],
    member_to_family: dict[str, str],
) -> list[dict]:
    published_by_family: dict[str, list[dict]] = defaultdict(list)
    for route in published_product_routes(root):
        if family_id := member_to_family.get(route["source_key"]):
            published_by_family[family_id].append(route)

    planned = []
    for family in families:
        if family["category_state"] != "source_category_unambiguous":
            planned.append(family)
            continue
        member_by_key = {
            member["compound_key"]: member for member in family["members"]
        }
        candidates = published_by_family.get(family["family_id"], [])
        selected = (
            max(
                candidates,
                key=lambda route: (
                    record_quality_score(member_by_key[route["source_key"]]),
                    route["source_key"],
                ),
            )
            if candidates
            else None
        )
        if selected:
            planned.append(
                {
                    **family,
                    "canonical_slug": selected["source_id"],
                    "canonical_source_key": selected["source_key"],
                    "canonical_source_id": selected["source_id"],
                    "topic_slug": selected["topic_slug"],
                    "planned_canonical_route": selected["legacy_route"],
                    "route_plan_state": "existing_route_preserved",
                    "route_plan_evidence": "published_products_existing_route",
                }
            )
        else:
            planned.append(family)
    return planned


def public_route_anchor(family: dict) -> str:
    """Return a deterministic source anchor used only in the governance ledger."""
    return min(member["compound_key"] for member in family["members"])


def prior_public_route_entries(root: Path) -> list[dict]:
    path = (
        root
        / "content"
        / "governance"
        / "product-catalog-v2-public-route-contract.json"
    )
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    entries = payload.get("entries")
    return entries if isinstance(entries, list) else []


def neutral_catalog_id(anchor_source_key: str) -> str:
    digest = hashlib.sha256(anchor_source_key.encode("utf-8")).hexdigest()[:16]
    return f"p-{digest}"


def plan_public_catalog_routes(root: Path, families: list[dict]) -> dict:
    """Create a stable neutral route ledger without changing legacy URLs.

    The ledger is intentionally governance-only: source keys never enter the
    browser-facing runtime. Existing canonical product URLs remain canonical
    for unambiguous families; every other family receives a neutral series URL.
    """
    prior_entries = prior_public_route_entries(root)
    prior_by_anchor = {
        entry.get("anchor_source_key"): entry
        for entry in prior_entries
        if entry.get("anchor_source_key")
        and entry.get("catalog_id")
        and entry.get("canonical_path")
    }
    prior_by_member: dict[str, list[dict]] = defaultdict(list)
    for entry in prior_entries:
        for member_key in entry.get("member_keys", []):
            prior_by_member[member_key].append(entry)

    used_catalog_ids: set[str] = set()
    entries = []
    for family in sorted(families, key=lambda item: item["family_id"]):
        anchor_source_key = public_route_anchor(family)
        existing_route = (
            family["planned_canonical_route"]
            if family["category_state"] == "source_category_unambiguous"
            else None
        )
        if existing_route:
            entries.append(
                {
                    "family_id": family["family_id"],
                    "anchor_source_key": anchor_source_key,
                    "member_keys": [
                        member["compound_key"] for member in family["members"]
                    ],
                    "catalog_id": None,
                    "canonical_path": existing_route,
                    "route_kind": "legacy_product_route",
                    "category_state": family["category_state"],
                    "source_categories": family["source_categories"],
                    "route_stability": "existing_public_route_preserved",
                }
            )
            continue

        prior = prior_by_anchor.get(anchor_source_key)
        if not prior:
            candidates = {
                entry.get("catalog_id"): entry
                for member in family["members"]
                for entry in prior_by_member.get(member["compound_key"], [])
                if entry.get("catalog_id") and entry.get("catalog_id") not in used_catalog_ids
            }
            if len(candidates) == 1:
                prior = next(iter(candidates.values()))
        catalog_id = (
            prior["catalog_id"]
            if prior and prior["catalog_id"] not in used_catalog_ids
            else neutral_catalog_id(anchor_source_key)
        )
        if catalog_id in used_catalog_ids:
            raise RuntimeError("catalog v2 public route ledger has duplicate catalog IDs")
        used_catalog_ids.add(catalog_id)
        entries.append(
            {
                "family_id": family["family_id"],
                "anchor_source_key": anchor_source_key,
                "member_keys": [
                    member["compound_key"] for member in family["members"]
                ],
                "catalog_id": catalog_id,
                "canonical_path": f"{PUBLIC_CATALOG_ROUTE_PREFIX}{catalog_id}",
                "route_kind": "neutral_catalog_series",
                "category_state": family["category_state"],
                "source_categories": family["source_categories"],
                "route_stability": "stable_governance_ledger",
            }
        )

    canonical_paths = [entry["canonical_path"] for entry in entries]
    if len(canonical_paths) != len(set(canonical_paths)):
        raise RuntimeError("catalog v2 public route ledger has duplicate canonical paths")
    return {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "strategy": "neutral_catalog_series",
        "policy_confirmation": "operator_confirmed_2026-07-21",
        "legacy_route_policy": "preserve_existing_product_urls",
        "cross_category_policy": "preserve_multiple_source_categories_without_forced_primary_category",
        "media_policy": "suppress_all_source_media_until_public_asset_authorization",
        "activation_state": "prepared_not_active",
        "family_count": len(entries),
        "neutral_catalog_route_count": sum(
            entry["route_kind"] == "neutral_catalog_series" for entry in entries
        ),
        "existing_product_route_count": sum(
            entry["route_kind"] == "legacy_product_route" for entry in entries
        ),
        "entries": entries,
    }


def public_card_specs(family: dict) -> list[dict]:
    facets = runtime_facets(family)
    labels = {
        "dimensions": "尺寸",
        "light_sources": "光源",
        "materials": "材质",
        "areas": "适用面积",
        "spaces": "适用空间",
        "styles": "风格",
    }
    return [
        {
            "key": key,
            "label": labels[key],
            "values": facets[key][:2],
            "evidence": "normalized_source_attributes",
        }
        for key in labels
        if facets.get(key)
    ][:3]


def public_catalog_item(family: dict, route: dict) -> dict:
    detail = family_detail_payload(family)
    display_paths = list(
        dict.fromkeys(
            path
            for path in [
                detail["representative_detail"]["primary_image"],
                *detail["representative_detail"]["detail_images"],
            ]
            if path
        )
    )
    model_label = source_model_label(family["representative"]["title"])
    return {
        "catalog_id": route["catalog_id"],
        "canonical_path": route["canonical_path"],
        "route_kind": route["route_kind"],
        "title": family["title"],
        "model_label": model_label,
        "source_categories": family["source_categories"],
        "category_state": family["category_state"],
        "member_count": family["member_count"],
        "grouping_evidence": family["grouping_evidence"],
        "review_state": "approved_and_applied",
        "card_specs": public_card_specs(family),
        "media": {
            "display_state": "suppressed_pending_authorization",
            "emitted_media_count": 0,
            "suppressed_source_media_count": len(display_paths),
        },
    }


def build_full_public_runtime(
    families: list[dict],
    public_route_contract: dict,
    full_batch: dict,
    active_batch_id: str,
) -> dict:
    family_by_id = {family["family_id"]: family for family in families}
    items = [
        public_catalog_item(family_by_id[route["family_id"]], route)
        for route in public_route_contract["entries"]
    ]
    emitted_media_count = sum(
        item["media"]["emitted_media_count"] for item in items
    )
    if emitted_media_count:
        raise RuntimeError("public catalog runtime must not emit source media")
    payload = {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "publication_state": "prepared_noindex",
        "batch_id": full_batch["batch_id"],
        "active_batch_id": active_batch_id,
        "route_strategy": public_route_contract["strategy"],
        "media_policy": public_route_contract["media_policy"],
        "catalog_count": len(items),
        "items": items,
    }
    serialized = compact_json_text(payload)
    if CATALOG_IMAGE_ORIGIN in serialized or CATALOG_IMAGE_PATH_PREFIX in serialized:
        raise RuntimeError("public catalog runtime contains a source media path")
    return payload


def current_route_aliases(
    root: Path,
    families: list[dict],
    member_to_family: dict[str, str],
) -> list[dict]:
    family_by_id = {family["family_id"]: family for family in families}
    aliases = []
    for item in published_product_routes(root):
        compound_key = item["source_key"]
        family_id = member_to_family.get(compound_key)
        family = family_by_id.get(family_id) if family_id else None
        planned_route = (
            family["planned_canonical_route"]
            if family
            else None
        )
        category_hold = bool(
            family
            and family["category_state"] == "pending_owner_selection"
        )
        aliases.append(
            {
                "family_id": family_id,
                "source_key": compound_key,
                "legacy_route": item["legacy_route"],
                "planned_canonical_route": planned_route,
                "route_action": (
                    "hold_for_category_assignment"
                    if category_hold
                    else
                    "preserve_canonical"
                    if planned_route == item["legacy_route"]
                    else "redirect_to_family_canonical"
                )
                if planned_route
                else "manual_review",
                "route_state": (
                    "cross_category_canonical_assignment_required"
                    if category_hold
                    else
                    "reserved_canonical_not_activated"
                    if planned_route == item["legacy_route"]
                    else "reserved_alias_not_activated"
                    if planned_route
                    else "source_missing_manual_review"
                ),
            }
        )
    return aliases


def build_active_alias_preview(
    route_aliases: list[dict],
    active_family_ids: list[str],
    batch_id: str,
) -> dict:
    active_ids = set(active_family_ids)
    aliases = []
    for alias in route_aliases:
        planned_route = alias.get("planned_canonical_route")
        family_id = alias.get("family_id")
        if family_id not in active_ids or not planned_route:
            continue
        aliases.append(
            {
                "source_key": alias["source_key"],
                "legacy_route": alias["legacy_route"],
                "family_id": family_id,
                "private_preview_route": f"/catalog-lab/{family_id}",
                "future_canonical_route": planned_route,
                "route_action": alias["route_action"],
                "would_redirect_status": (
                    308
                    if alias["route_action"] == "redirect_to_family_canonical"
                    else None
                ),
                "activation": False,
            }
        )
    aliases.sort(key=lambda item: item["legacy_route"])
    return {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "batch_id": batch_id,
        "mode": "dry_run",
        "activation": False,
        "worker_imported": False,
        "sitemap_included": False,
        "alias_count": len(aliases),
        "canonical_preservation_count": sum(
            item["route_action"] == "preserve_canonical"
            for item in aliases
        ),
        "redirect_count": sum(
            item["route_action"] == "redirect_to_family_canonical"
            for item in aliases
        ),
        "aliases": aliases,
    }


def select_sample_families(
    families: list[dict],
    route_aliases: list[dict],
    limit: int = SAMPLE_SIZE,
) -> list[dict]:
    family_by_id = {family["family_id"]: family for family in families}
    selected: list[dict] = []
    selected_ids: set[str] = set()

    def add(family: dict | None) -> None:
        if family and family["family_id"] not in selected_ids and len(selected) < limit:
            selected.append(family)
            selected_ids.add(family["family_id"])

    for alias in route_aliases:
        add(family_by_id.get(alias["family_id"]))

    buckets: dict[str, list[dict]] = defaultdict(list)
    for family in families:
        if family["family_id"] not in selected_ids:
            buckets[family["category"]].append(family)
    for bucket in buckets.values():
        bucket.sort(
            key=lambda family: (
                -family["representative_score"],
                family["family_id"],
            )
        )

    category_order = sorted(
        buckets,
        key=lambda category: (-len(buckets[category]), category),
    )
    for category in category_order:
        add(buckets[category].pop(0) if buckets[category] else None)
    while len(selected) < limit:
        progressed = False
        for category in category_order:
            if buckets[category]:
                add(buckets[category].pop(0))
                progressed = True
                if len(selected) == limit:
                    break
        if not progressed:
            break
    return selected


def variant_payload(record: dict) -> dict:
    return {
        "variant_id": "variant-"
        + hashlib.sha256(record["compound_key"].encode("utf-8")).hexdigest()[:12],
        "source_key": record["compound_key"],
        "display_id": record["display_id"],
        "label": record["title"],
        "dimensions": variant_dimensions(record),
        "normalized_specs": [
            {
                "source_spec_code": spec["source_spec_code"],
                "source_row": spec["source_row"],
                "normalization": spec["normalization"],
                "weight": spec["weight"],
                "volume": spec["volume"],
            }
            for spec in record["specs"]
        ],
        "quality_flags": quality_flags(record),
    }


def runtime_image_path(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlsplit(value)
    if (
        f"{parsed.scheme}://{parsed.netloc}" != CATALOG_IMAGE_ORIGIN
        or not parsed.path.startswith(CATALOG_IMAGE_PATH_PREFIX)
        or parsed.query
        or parsed.fragment
    ):
        return None
    return parsed.path


def family_index_payload(
    family: dict,
    detail_state: str = "rich_private_preview",
) -> dict:
    representative = family["representative"]
    facets = runtime_facets(family)
    model_label = source_model_label(representative["title"])
    series_labels = list(
        dict.fromkeys(
            label
            for member in family["members"]
            if (label := source_series_label(member["title"]))
        )
    )
    series_label = series_labels[0] if len(series_labels) == 1 else None
    card_spec_labels = {
        "dimensions": "尺寸",
        "light_sources": "光源",
        "materials": "材质",
        "areas": "适用面积",
        "spaces": "适用空间",
        "styles": "风格",
    }
    card_specs = [
        {
            "key": key,
            "label": card_spec_labels[key],
            "values": facets[key][:2],
            "evidence": "normalized_source_attributes",
        }
        for key in card_spec_labels
        if facets.get(key)
    ][:3]
    return {
        "family_id": family["family_id"],
        "canonical_slug": family["canonical_slug"],
        "canonical_source_key": family["canonical_source_key"],
        "canonical_source_id": family["canonical_source_id"],
        "topic_slug": family["topic_slug"],
        "planned_canonical_route": family["planned_canonical_route"],
        "route_plan_state": family["route_plan_state"],
        "route_plan_evidence": family["route_plan_evidence"],
        "title": family["title"],
        "category": family["category"],
        "source_categories": family["source_categories"],
        "category_state": family["category_state"],
        "member_count": family["member_count"],
        "grouping_status": family["grouping_status"],
        "review_state": (
            "approved_and_applied"
            if family.get("applied_decision_ids")
            else "pending_family_review"
            if family["grouping_status"]
            == "auto_merged_shared_reference_image_set"
            else "private_unreleased"
        ),
        "detail_state": detail_state,
        "detail_ref": f"/catalog-lab/{family['family_id']}",
        "model_label": model_label,
        "model_state": (
            "source_title_model_prefix" if model_label else "pending_review"
        ),
        "model_evidence": (
            "representative_source_title" if model_label else None
        ),
        "series_label": series_label,
        "series_state": (
            "source_title_literal"
            if series_label
            else "conflicting_source_literals"
            if len(series_labels) > 1
            else "pending_review"
        ),
        "representative": {
            "source_key": representative["compound_key"],
            "display_id": representative["display_id"],
            "title": representative["title"],
            "primary_image": runtime_image_path(representative["primary_image"]),
        },
        "variant_refs": [
            {
                "source_key": member["compound_key"],
                "source_id": member["source_id"],
                "display_id": member["display_id"],
                "model_label": source_model_label(member["title"]),
                "model_state": (
                    "source_title_model_prefix"
                    if source_model_label(member["title"])
                    else "pending_review"
                ),
            }
            for member in family["members"]
        ],
        "card_specs": card_specs,
        "facets": facets,
        "quality_flags": quality_flags(representative),
    }


def family_detail_payload(family: dict) -> dict:
    representative = family["representative"]
    detail_images = [
        image_path
        for image in representative["detail_images"]
        if (image_path := runtime_image_path(image))
    ]
    return {
        "schema_version": 1,
        "family": family_index_payload(family),
        "grouping_evidence": family["grouping_evidence"],
        "source_references": [
            {
                "source_key": member["compound_key"],
                "source_path": member["source_path"],
                "source_sha256": member["source_sha256"],
            }
            for member in family["members"]
        ],
        "representative_detail": {
            "attributes": representative["attributes"],
            "primary_image": runtime_image_path(representative["primary_image"]),
            "detail_images": detail_images[:12],
            "detail_image_count": len(representative["detail_images"]),
        },
        "variants": [variant_payload(member) for member in family["members"]],
        "editorial_policy": {
            "source_of_truth": "frozen_source_reference",
            "product_body_copy": "not_duplicated",
            "commercial_fields": "omitted",
            "manual_family_review_required": family["member_count"] > 1,
        },
    }


def authorized_runtime_detail_payload(
    detail: dict,
    authorized_paths: set[str],
) -> dict:
    source_primary = detail["representative_detail"]["primary_image"]
    source_details = detail["representative_detail"]["detail_images"]
    emitted_primary = (
        source_primary if source_primary in authorized_paths else None
    )
    emitted_details = [
        path for path in source_details if path in authorized_paths
    ]
    source_display_paths = list(
        dict.fromkeys(
            path
            for path in [source_primary, *source_details]
            if path
        )
    )
    emitted_display_paths = list(
        dict.fromkeys(
            path
            for path in [emitted_primary, *emitted_details]
            if path
        )
    )
    family = {
        **detail["family"],
        "representative": {
            **detail["family"]["representative"],
            "primary_image": emitted_primary,
        },
    }
    representative_detail = {
        **detail["representative_detail"],
        "primary_image": emitted_primary,
        "detail_images": emitted_details,
        "emitted_detail_image_count": len(emitted_details),
        "suppressed_media_path_count": (
            len(source_display_paths) - len(emitted_display_paths)
        ),
        "media_policy": "approved_batch_paths_only_private_preview",
    }
    return {
        **detail,
        "family": family,
        "representative_detail": representative_detail,
        "editorial_policy": {
            **detail["editorial_policy"],
            "media_projection": (
                "unauthorized_paths_suppressed_from_runtime"
            ),
        },
    }


def build_full_private_runtime_index(
    families: list[dict],
    total_source_count: int,
    eligible_source_count: int,
    excluded_source_count: int,
    source_snapshot_sha256: str,
    source_disposition_sha256: str,
    decision_application_sha256: str,
    authorized_paths: set[str],
    rich_detail_family_ids: set[str],
) -> tuple[dict, dict[str, dict]]:
    sorted_families = sorted(families, key=lambda family: family["family_id"])
    family_ids = [family["family_id"] for family in sorted_families]
    family_set_sha256 = stable_json_sha256(sorted(family_ids))
    index_rows = []
    for family in sorted_families:
        row = family_index_payload(
            family,
            "rich_private_preview"
            if family["family_id"] in rich_detail_family_ids
            else "safe_index_summary",
        )
        primary_image = row["representative"]["primary_image"]
        row["representative"] = {
            **row["representative"],
            "primary_image": (
                primary_image if primary_image in authorized_paths else None
            ),
        }
        index_rows.append(row)

    shard_payloads: dict[str, dict] = {}
    shard_descriptors = []
    for offset in range(
        0,
        len(index_rows),
        FULL_PRIVATE_RUNTIME_FAMILY_SHARD_SIZE,
    ):
        shard_number = (
            offset // FULL_PRIVATE_RUNTIME_FAMILY_SHARD_SIZE + 1
        )
        file_name = f"index-{shard_number:04d}.json"
        items = index_rows[
            offset : offset + FULL_PRIVATE_RUNTIME_FAMILY_SHARD_SIZE
        ]
        payload = {
            "schema_version": 1,
            "projection": "product_catalog_v2_full_private_runtime_index_shard",
            "visibility": "private_noindex",
            "robots_index": False,
            "sitemap_included": False,
            "alias_activation": False,
            "media_policy": "approved_batch_paths_only_unauthorized_suppressed",
            "source_snapshot_sha256": source_snapshot_sha256,
            "decision_application_sha256": decision_application_sha256,
            "family_set_sha256": family_set_sha256,
            "shard_number": shard_number,
            "family_count": len(items),
            "items": items,
        }
        shard_text = compact_json_text(payload)
        shard_payloads[file_name] = payload
        shard_descriptors.append(
            {
                "file": file_name,
                "family_count": len(items),
                "first_family_id": items[0]["family_id"],
                "last_family_id": items[-1]["family_id"],
                "bytes": len(shard_text.encode("utf-8")),
                "sha256": hashlib.sha256(
                    shard_text.encode("utf-8")
                ).hexdigest(),
            }
        )

    emitted_primary_paths = {
        row["representative"]["primary_image"]
        for row in index_rows
        if row["representative"]["primary_image"]
    }
    if (
        len(family_ids) != len(set(family_ids))
        or sum(item["family_count"] for item in shard_descriptors)
        != len(index_rows)
        or sum(len(row["variant_refs"]) for row in index_rows)
        != eligible_source_count
        or total_source_count
        != eligible_source_count + excluded_source_count
        or not emitted_primary_paths.issubset(authorized_paths)
    ):
        raise RuntimeError("catalog v2 full private runtime index failed")

    manifest = {
        "schema_version": 1,
        "projection": "product_catalog_v2_full_private_runtime_index",
        "snapshot_date": SNAPSHOT_DATE,
        "visibility": "private_noindex",
        "publication_state": "private_runtime_not_public_release",
        "robots_index": False,
        "sitemap_included": False,
        "formal_routes_activated": False,
        "alias_activation": False,
        "media_policy": "approved_batch_paths_only_unauthorized_suppressed",
        "source_snapshot_sha256": source_snapshot_sha256,
        "decision_application_sha256": decision_application_sha256,
        "family_set_sha256": family_set_sha256,
        "total_source_count": total_source_count,
        "eligible_source_count": eligible_source_count,
        "excluded_source_count": excluded_source_count,
        "source_disposition_sha256": source_disposition_sha256,
        "source_count": eligible_source_count,
        "family_count": len(index_rows),
        "route_ready_family_count": sum(
            row["route_plan_state"] == "existing_route_preserved"
            for row in index_rows
        ),
        "route_pending_family_count": sum(
            row["planned_canonical_route"] is None
            for row in index_rows
        ),
        "rich_detail_family_count": sum(
            row["detail_state"] == "rich_private_preview"
            for row in index_rows
        ),
        "summary_detail_family_count": sum(
            row["detail_state"] == "safe_index_summary"
            for row in index_rows
        ),
        "shard_size": FULL_PRIVATE_RUNTIME_FAMILY_SHARD_SIZE,
        "shard_count": len(shard_descriptors),
        "emitted_primary_media_path_count": len(emitted_primary_paths),
        "shards": shard_descriptors,
    }
    return manifest, shard_payloads


def forbidden_runtime_keys(payload: object) -> list[str]:
    found: set[str] = set()

    def visit(value: object) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key.lower() in PRIVATE_RUNTIME_FORBIDDEN_KEYS:
                    found.add(key)
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(payload)
    return sorted(found)


def json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def compact_json_text(value: object) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
    ) + "\n"


def governance_quality_gaps(record: dict) -> list[str]:
    gaps = list(quality_flags(record))
    if record["local_media_evidence"]:
        gaps.append("local_media_governance_only_not_runtime_authorized")
    if record["source_type"] == "local_supplement":
        if not record["attributes"]:
            gaps.append("supplement_attributes_incomplete")
        if not record["specs"]:
            gaps.append("supplement_specs_incomplete")
    return sorted(set(gaps))


def review_membership_by_source(
    review_rows: list[dict],
    category_candidates: list[dict],
) -> dict[str, set[str]]:
    memberships: dict[str, set[str]] = defaultdict(set)
    for row in review_rows:
        for source_key in row["member_keys"].split("|"):
            if source_key:
                memberships[source_key].add(row["review_id"])
    for candidate in category_candidates:
        memberships[candidate["source_key"]].add(candidate["review_id"])
    return memberships


def governance_review_state(
    review_ids: set[str],
    active_approved_review_ids: set[str],
    applied_review_ids: set[str],
) -> dict:
    required = sorted(review_ids)
    approved = sorted(review_ids & active_approved_review_ids)
    applied = sorted(review_ids & applied_review_ids)
    pending = sorted(review_ids - active_approved_review_ids)
    if not required:
        state = "not_required"
    elif pending and approved:
        state = "partially_approved"
    elif pending:
        state = "pending_human_review"
    elif set(required).issubset(applied_review_ids):
        state = "approved_and_applied"
    else:
        state = "approved_pending_application"
    return {
        "state": state,
        "required_review_ids": required,
        "active_approved_review_ids": approved,
        "applied_review_ids": applied,
        "pending_review_ids": pending,
    }


def projection_has_runtime_media_reference(payload: object) -> bool:
    serialized = json.dumps(payload, ensure_ascii=False).lower()
    return any(
        marker in serialized
        for marker in (
            "http://",
            "https://",
            "bocang.oss",
            "/upload/",
            "/api/catalog-image",
            "/media/source/",
        )
    )


def build_full_governance_projection(
    records: list[dict],
    excluded_records: list[dict],
    families: list[dict],
    member_to_family: dict[str, str],
    sample_families: list[dict],
    review_rows: list[dict],
    category_candidates: list[dict],
    active_approved_decisions: dict[str, dict],
    decision_application: dict,
    source_snapshot_sha256: str,
    active_batch_id: str,
    runtime_payload: object,
    authorized_paths: set[str],
) -> tuple[dict, dict, dict[str, dict]]:
    excluded_by_key = {
        record["compound_key"]: record for record in excluded_records
    }
    decision_excluded_by_key = {
        item["source_key"]: item
        for item in decision_application["excluded_sources"]
    }
    family_by_id = {family["family_id"]: family for family in families}
    sample_family_ids = {family["family_id"] for family in sample_families}
    sample_source_keys = {
        member["compound_key"]
        for family in sample_families
        for member in family["members"]
    }
    review_memberships = review_membership_by_source(
        review_rows,
        category_candidates,
    )
    active_approved_review_ids = set(active_approved_decisions)
    applied_review_ids = set(decision_application["applied_review_ids"])

    source_rows = []
    for record in sorted(records, key=lambda item: item["compound_key"]):
        source_key = record["compound_key"]
        family_id = member_to_family.get(source_key)
        if source_key in excluded_by_key:
            disposition = "governance_only_excluded_non_lighting"
            terminal_detail = "static_web_catalog_boundary"
        elif source_key in decision_excluded_by_key:
            disposition = "governance_only_decision_excluded"
            terminal_detail = decision_excluded_by_key[source_key]["disposition"]
        elif family_id:
            disposition = "eligible_family_candidate"
            terminal_detail = "assigned_to_single_candidate_family"
        else:
            raise RuntimeError(
                f"catalog v2 full governance source lacks disposition: {source_key}"
            )
        review_state = governance_review_state(
            review_memberships.get(source_key, set()),
            active_approved_review_ids,
            applied_review_ids,
        )
        if source_key in excluded_by_key:
            review_state = {
                **review_state,
                "state": "not_required_static_exclusion",
            }
        source_rows.append(
            {
                "source_key": source_key,
                "source_type": record["source_type"],
                "source_id": record["source_id"],
                "source_path": record["source_path"],
                "source_sha256": record["source_sha256"],
                "title": record["title"],
                "source_category": record["category"],
                "disposition": disposition,
                "terminal_detail": terminal_detail,
                "family_id": family_id,
                "family_category": (
                    family_by_id[family_id]["category"] if family_id else None
                ),
                "sample_membership": {
                    "in_active_private_sample": source_key in sample_source_keys,
                    "batch_id": (
                        active_batch_id
                        if source_key in sample_source_keys
                        else None
                    ),
                },
                "quality_gaps": governance_quality_gaps(record),
                "manual_review": review_state,
                "local_media_evidence": record["local_media_evidence"],
            }
        )

    family_member_counts = Counter(
        member["compound_key"]
        for family in families
        for member in family["members"]
    )
    family_rows = []
    for family in sorted(families, key=lambda item: item["family_id"]):
        source_keys = [
            member["compound_key"] for member in family["members"]
        ]
        family_review_ids = set().union(
            *(review_memberships.get(source_key, set()) for source_key in source_keys)
        ) if source_keys else set()
        family_rows.append(
            {
                "family_id": family["family_id"],
                "title": family["title"],
                "category": family["category"],
                "source_categories": family["source_categories"],
                "category_state": family["category_state"],
                "grouping_status": family["grouping_status"],
                "grouping_evidence": family["grouping_evidence"],
                "member_count": family["member_count"],
                "source_keys": source_keys,
                "representative_source_key": family["representative"][
                    "compound_key"
                ],
                "candidate_facet_keys": sorted(family["facets"]),
                "sample_membership": {
                    "in_active_private_sample": family["family_id"]
                    in sample_family_ids,
                    "batch_id": (
                        active_batch_id
                        if family["family_id"] in sample_family_ids
                        else None
                    ),
                },
                "quality_gaps": sorted(
                    {
                        gap
                        for member in family["members"]
                        for gap in governance_quality_gaps(member)
                    }
                ),
                "local_media_evidence_source_count": sum(
                    bool(member["local_media_evidence"])
                    for member in family["members"]
                ),
                "manual_review": governance_review_state(
                    family_review_ids,
                    active_approved_review_ids,
                    applied_review_ids,
                ),
            }
        )

    shard_payloads: dict[str, dict] = {}
    shard_descriptors = []
    for offset in range(0, len(family_rows), FULL_GOVERNANCE_FAMILY_SHARD_SIZE):
        shard_number = offset // FULL_GOVERNANCE_FAMILY_SHARD_SIZE + 1
        file_name = f"families-{shard_number:04d}.json"
        shard_families = family_rows[
            offset : offset + FULL_GOVERNANCE_FAMILY_SHARD_SIZE
        ]
        payload = {
            "schema_version": 1,
            "projection": "product_catalog_v2_family_staging",
            "visibility": "private_governance_only",
            "runtime_emission": False,
            "media_policy": "metadata_only_no_media_urls",
            "source_snapshot_sha256": source_snapshot_sha256,
            "decision_application_sha256": decision_application[
                "decision_application_sha256"
            ],
            "shard_number": shard_number,
            "family_count": len(shard_families),
            "families": shard_families,
        }
        shard_payloads[file_name] = payload
        shard_descriptors.append(
            {
                "file": file_name,
                "family_count": len(shard_families),
                "sha256": hashlib.sha256(
                    json_text(payload).encode("utf-8")
                ).hexdigest(),
            }
        )

    all_source_keys = [row["source_key"] for row in source_rows]
    static_eligible_source_keys = {
        record["compound_key"]
        for record in records
        if record["compound_key"] not in excluded_by_key
    }
    decision_excluded_source_keys = set(decision_excluded_by_key)
    effective_eligible_source_keys = (
        static_eligible_source_keys - decision_excluded_source_keys
    )
    static_excluded_source_keys = set(excluded_by_key)
    family_source_keys = set(family_member_counts)
    local_media_rows = [
        row for row in source_rows if row["local_media_evidence"]
    ]
    local_media_paths = {
        evidence["catalog_relative_path"]
        for row in local_media_rows
        for evidence in row["local_media_evidence"]
    }
    runtime_serialized = json.dumps(runtime_payload, ensure_ascii=False)
    projection_payloads = {
        "sources": source_rows,
        "family_shards": shard_payloads,
    }
    acceptance = {
        "source_count_is_1920": len(source_rows) == 1920,
        "source_keys_are_unique": len(all_source_keys)
        == len(set(all_source_keys)),
        "static_eligible_source_count_is_1913": (
            len(static_eligible_source_keys) == 1913
        ),
        "effective_eligible_sources_each_belong_to_one_family": (
            family_source_keys == effective_eligible_source_keys
            and all(
                family_member_counts[source_key] == 1
                for source_key in effective_eligible_source_keys
            )
        ),
        "excluded_non_lighting_count_is_7": len(excluded_by_key) == 7,
        "source_dispositions_are_exhaustive_and_disjoint": (
            not (
                family_source_keys & static_excluded_source_keys
                or family_source_keys & decision_excluded_source_keys
                or static_excluded_source_keys & decision_excluded_source_keys
            )
            and (
                family_source_keys
                | static_excluded_source_keys
                | decision_excluded_source_keys
            )
            == set(all_source_keys)
        ),
        "candidate_family_count_matches_effective_model": (
            len(family_rows)
            == len(family_by_id)
            == decision_application["output_family_count"]
        ),
        "family_ids_are_unique": (
            len(family_rows)
            == len({row["family_id"] for row in family_rows})
        ),
        "all_family_rows_are_sharded_once": sum(
            descriptor["family_count"] for descriptor in shard_descriptors
        )
        == len(family_rows),
        "projection_contains_no_runtime_media_reference": not projection_has_runtime_media_reference(
            projection_payloads
        ),
        "supplement_local_media_evidence_is_complete": (
            {
                row["source_key"] for row in local_media_rows
            }
            == {
                "local_supplement:补充-120116",
                "local_supplement:补充-120118",
                "local_supplement:补充-120122",
            }
            and sum(
                len(row["local_media_evidence"])
                for row in local_media_rows
            )
            == 20
            and all(
                evidence["exists"]
                and evidence["bytes"] > 0
                and isinstance(evidence["sha256"], str)
                for row in local_media_rows
                for evidence in row["local_media_evidence"]
            )
        ),
        "local_media_evidence_never_enters_runtime_or_authorization": (
            all(path not in runtime_serialized for path in local_media_paths)
            and local_media_paths.isdisjoint(authorized_paths)
        ),
    }
    failed = [name for name, passed in acceptance.items() if not passed]
    if failed:
        raise RuntimeError(
            "catalog v2 full governance projection failed: "
            + ", ".join(failed)
        )

    source_disposition = {
        "schema_version": 1,
        "projection": "product_catalog_v2_full_source_disposition",
        "snapshot_date": SNAPSHOT_DATE,
        "visibility": "private_governance_only",
        "runtime_emission": False,
        "sitemap_included": False,
        "media_policy": "local_file_evidence_metadata_only_never_runtime_authorized",
        "source_snapshot_sha256": source_snapshot_sha256,
        "decision_application_sha256": decision_application[
            "decision_application_sha256"
        ],
        "counts": {
            "source_count": len(source_rows),
            "eligible_source_count": len(static_eligible_source_keys),
            "effective_eligible_source_count": len(
                effective_eligible_source_keys
            ),
            "family_assigned_source_count": len(family_source_keys),
            "excluded_non_lighting_source_count": len(excluded_by_key),
            "decision_excluded_source_count": len(decision_excluded_by_key),
            "candidate_family_count": len(family_rows),
            "sample_source_count": len(sample_source_keys),
            "local_media_evidence_source_count": len(local_media_rows),
            "local_media_evidence_file_count": sum(
                len(row["local_media_evidence"])
                for row in local_media_rows
            ),
        },
        "acceptance": acceptance,
        "sources": source_rows,
    }
    family_staging_manifest = {
        "schema_version": 1,
        "projection": "product_catalog_v2_full_family_staging",
        "snapshot_date": SNAPSHOT_DATE,
        "visibility": "private_governance_only",
        "publication_state": "not_runtime_not_indexable_not_authorized",
        "runtime_emission": False,
        "sitemap_included": False,
        "media_policy": "metadata_only_no_media_urls",
        "human_decision_ledger_modified": False,
        "source_snapshot_sha256": source_snapshot_sha256,
        "decision_application_sha256": decision_application[
            "decision_application_sha256"
        ],
        "source_disposition_artifact": "../product-catalog-v2-source-disposition.json",
        "source_count": len(source_rows),
        "eligible_source_count": len(static_eligible_source_keys),
        "effective_eligible_source_count": len(
            effective_eligible_source_keys
        ),
        "excluded_non_lighting_source_count": len(excluded_by_key),
        "family_count": len(family_rows),
        "shard_size": FULL_GOVERNANCE_FAMILY_SHARD_SIZE,
        "shard_count": len(shard_descriptors),
        "shards": shard_descriptors,
        "acceptance": acceptance,
    }
    if projection_has_runtime_media_reference(
        {"source": source_disposition, "manifest": family_staging_manifest}
    ):
        raise RuntimeError(
            "catalog v2 full governance metadata contains a runtime media reference"
        )
    return source_disposition, family_staging_manifest, shard_payloads


def review_csv_text(rows: list[dict]) -> str:
    columns = [
        "review_id",
        "review_kind",
        "decision_status",
        "machine_state",
        "candidate_sha256",
        "source_snapshot_sha256",
        "evidence_type",
        "model_signature",
        "category",
        "member_count",
        "member_keys",
        "suggested_action",
        "auto_family_id",
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def typescript_registry_text(sample_families: list[dict]) -> str:
    loaders = "\n".join(
        f'  "{family["family_id"]}": () => import("./runtime/catalog-v2/details/{family["family_id"]}.json"),'
        for family in sample_families
    )
    return f"""// Generated by scripts/build_product_catalog.py --catalog-v2.
// The source of truth remains the frozen SQL and Obsidian snapshot.
import rawIndex from "./runtime/catalog-v2/index.json";
import rawManifest from "./runtime/catalog-v2/manifest.json";

export type CatalogV2FamilyIndex = {{
  family_id: string;
  canonical_slug: string;
  canonical_source_key: string;
  canonical_source_id: string;
  topic_slug: string | null;
  planned_canonical_route: string | null;
  route_plan_state: "pending_category_selection" | "pending_topic_assignment" | "existing_route_preserved";
  route_plan_evidence: string;
  title: string;
  category: string;
  source_categories: string[];
  category_state: "source_category_unambiguous" | "pending_owner_selection";
  member_count: number;
  grouping_status: "auto_merged_shared_reference_image_set" | "singleton_unreviewed" | "human_approved_recategorize" | "human_approved_exclusion" | "human_approved_split" | "human_approved_merge";
  review_state: string;
  detail_state: string;
  detail_ref: string;
  model_label: string | null;
  model_state: string;
  model_evidence: string | null;
  series_label: string | null;
  series_state: string;
  representative: {{
    source_key: string;
    display_id: string;
    title: string;
    primary_image: string | null;
  }};
  variant_refs: Array<{{
    source_key: string;
    source_id: string;
    display_id: string;
    model_label: string | null;
    model_state: string;
  }}>;
  card_specs: Array<{{
    key: string;
    label: string;
    values: string[];
    evidence: string;
  }}>;
  facets: Record<string, string[]>;
  quality_flags: string[];
}};

export type CatalogV2Variant = {{
  variant_id: string;
  source_key: string;
  display_id: string;
  label: string;
  dimensions: Record<string, {{ value: string; evidence: string }}>;
  normalized_specs: Array<{{
    source_spec_code: string | null;
    source_row: number;
    normalization: string;
    weight: string | null;
    volume: string | null;
  }}>;
  quality_flags: string[];
}};

export type CatalogV2Detail = {{
  schema_version: number;
  family: CatalogV2FamilyIndex;
  grouping_evidence: string;
  source_references: Array<{{
    source_key: string;
    source_path: string;
    source_sha256: string;
  }}>;
  representative_detail: {{
    attributes: Record<string, string>;
    primary_image: string | null;
    detail_images: string[];
    detail_image_count: number;
    emitted_detail_image_count: number;
    suppressed_media_path_count: number;
    media_policy: string;
  }};
  variants: CatalogV2Variant[];
  editorial_policy: {{
    source_of_truth: string;
    product_body_copy: string;
    commercial_fields: string;
    manual_family_review_required: boolean;
    media_projection: string;
  }};
}};

export const catalogV2Index = rawIndex as {{
  schema_version: number;
  snapshot_date: string;
  visibility: string;
  sample_size: number;
  items: CatalogV2FamilyIndex[];
}};

export const catalogV2Manifest = rawManifest;

const detailLoaders: Record<
  string,
  () => Promise<{{ default: unknown }}>
> = {{
{loaders}
}};

export const catalogV2FamilyIds = Object.freeze(Object.keys(detailLoaders));

export async function catalogV2DetailById(familyId: string) {{
  const loader = detailLoaders[familyId];
  return loader ? ((await loader()).default as CatalogV2Detail) : null;
}}
"""


def catalog_snapshot_sha256(source_report: dict) -> str:
    sources = source_report["sources"]
    return stable_json_sha256(
        {
            "snapshot_date": SNAPSHOT_DATE,
            "mall_sql_sha256": sources["mall_sql"]["sha256"],
            "knowledge_notes_sha256": sources[
                "knowledge_base_product_notes"
            ]["aggregate_sha256"],
            "local_supplement_keys": sources["local_supplements"][
                "compound_keys"
            ],
            "excluded_source_ids": sorted(WEB_CATALOG_EXCLUDED_SOURCE_IDS),
        }
    )


def build_category_review_candidates(
    records: list[dict],
    source_snapshot_sha256: str,
) -> list[dict]:
    candidates = []
    for record in sorted(
        (item for item in records if item["category"] == "类别"),
        key=lambda item: item["compound_key"],
    ):
        review_id = "category-" + record["compound_key"].replace(":", "-").replace(
            "_", "-"
        )
        candidate = {
            "review_id": review_id,
            "review_kind": "category_anomaly",
            "source_key": record["compound_key"],
            "source_category": record["category"],
            "title": record["title"],
            "source_snapshot_sha256": source_snapshot_sha256,
        }
        candidate["candidate_sha256"] = stable_json_sha256(candidate)
        candidates.append(candidate)
    return candidates


def validate_decision_details(
    candidate: dict,
    decision: dict,
    allowed_categories: set[str],
) -> None:
    decision_id = decision["decision_id"]
    action = decision["action"]
    member_keys = set(candidate.get("member_keys", "").split("|")) - {""}

    if action == "split_family":
        split_groups = decision.get("split_groups")
        if (
            not isinstance(split_groups, list)
            or len(split_groups) < 2
            or any(
                not isinstance(group, list)
                or not group
                or any(not isinstance(item, str) or not item for item in group)
                for group in split_groups
            )
        ):
            raise RuntimeError(
                f"catalog v2 split decision lacks valid groups: {decision_id}"
            )
        flattened = [item for group in split_groups for item in group]
        if len(flattened) != len(set(flattened)) or set(flattened) != member_keys:
            raise RuntimeError(
                f"catalog v2 split decision does not partition members: {decision_id}"
            )

    if action == "recategorize":
        target_category = decision.get("target_category")
        if (
            not isinstance(target_category, str)
            or not target_category.strip()
            or target_category.strip() in {"类别", "待复核"}
            or target_category.strip() not in allowed_categories
        ):
            raise RuntimeError(
                f"catalog v2 recategorize decision lacks target category: {decision_id}"
            )

    if action == "exclude_with_disposition":
        disposition = decision.get("disposition")
        if (
            not isinstance(disposition, str)
            or disposition not in REVIEW_ALLOWED_DISPOSITIONS
        ):
            raise RuntimeError(
                f"catalog v2 exclusion decision lacks disposition: {decision_id}"
            )


def validate_family_decisions(
    root: Path,
    review_rows: list[dict],
    category_candidates: list[dict],
    source_snapshot_sha256: str,
    allowed_categories: set[str],
) -> tuple[dict, dict[str, dict]]:
    path = (
        root
        / "content"
        / "governance"
        / "product-catalog-v2-family-decisions.json"
    )
    if not path.exists():
        raise RuntimeError(f"missing human-owned decision ledger: {path}")
    ledger = json.loads(path.read_text(encoding="utf-8"))
    if ledger.get("schema_version") != 1:
        raise RuntimeError("catalog v2 decision ledger schema_version must be 1")
    if (
        ledger.get("ledger_id") != "catalog-v2-family-decisions"
        or ledger.get("ownership") != "human_reviewed_append_only"
        or ledger.get("revision_policy")
        != "append_a_new_decision_and_reference_supersedes_decision_id"
    ):
        raise RuntimeError("catalog v2 decision ledger contract is invalid")
    if ledger.get("source_snapshot_sha256") != source_snapshot_sha256:
        raise RuntimeError("catalog v2 decision ledger source snapshot is stale")
    decisions = ledger.get("decisions")
    if not isinstance(decisions, list):
        raise RuntimeError("catalog v2 decision ledger decisions must be a list")

    candidates = {
        item["review_id"]: item for item in [*review_rows, *category_candidates]
    }
    decisions_by_id: dict[str, dict] = {}
    latest_decision_by_review: dict[str, str] = {}
    superseded: set[str] = set()
    for decision in decisions:
        if not isinstance(decision, dict):
            raise RuntimeError("catalog v2 decision entry must be an object")
        decision_id = decision.get("decision_id")
        review_id = decision.get("review_id")
        if not isinstance(decision_id, str) or not re.fullmatch(
            r"decision-[a-z0-9-]{6,72}", decision_id
        ):
            raise RuntimeError("catalog v2 decision_id is invalid")
        if decision_id in decisions_by_id:
            raise RuntimeError(f"duplicate catalog v2 decision_id: {decision_id}")
        candidate = candidates.get(review_id)
        if not candidate:
            raise RuntimeError(f"unknown catalog v2 review_id: {review_id}")
        if decision.get("candidate_sha256") != candidate["candidate_sha256"]:
            raise RuntimeError(f"stale catalog v2 decision candidate: {decision_id}")
        if decision.get("status") not in {"draft", "approved"}:
            raise RuntimeError(f"invalid catalog v2 decision status: {decision_id}")
        if decision.get("action") not in REVIEW_ALLOWED_ACTIONS[
            candidate["review_kind"]
        ]:
            raise RuntimeError(f"invalid catalog v2 decision action: {decision_id}")
        if decision.get("status") == "approved":
            validate_decision_details(
                candidate,
                decision,
                allowed_categories,
            )
        if decision["status"] == "approved":
            if not all(
                isinstance(decision.get(field), str)
                and decision[field].strip()
                for field in ("reviewer", "reviewed_at", "rationale")
            ):
                raise RuntimeError(
                    f"approved catalog v2 decision lacks signoff: {decision_id}"
                )
            try:
                reviewed_on = date.fromisoformat(decision["reviewed_at"])
            except ValueError:
                raise RuntimeError(
                    f"approved catalog v2 decision date is invalid: {decision_id}"
                )
        supersedes = decision.get("supersedes_decision_id")
        previous_head = latest_decision_by_review.get(review_id)
        if previous_head is None and supersedes is not None:
            raise RuntimeError(
                f"catalog v2 first decision cannot supersede another entry: {decision_id}"
            )
        if previous_head is not None and supersedes != previous_head:
            raise RuntimeError(
                f"catalog v2 decision revision must supersede the current head: {decision_id}"
            )
        if supersedes is not None:
            previous = decisions_by_id.get(supersedes)
            if not previous or previous.get("review_id") != review_id:
                raise RuntimeError(
                    f"catalog v2 superseded decision is invalid: {decision_id}"
                )
            if decision["status"] == "approved":
                ancestor_id = supersedes
                while ancestor_id:
                    superseded.add(ancestor_id)
                    ancestor = decisions_by_id[ancestor_id]
                    if (
                        ancestor.get("status") == "approved"
                        and date.fromisoformat(ancestor["reviewed_at"])
                        > reviewed_on
                    ):
                        raise RuntimeError(
                            "catalog v2 approved revision predates its "
                            f"approved ancestor: {decision_id}"
                        )
                    ancestor_id = ancestor.get("supersedes_decision_id")
        decisions_by_id[decision_id] = decision
        latest_decision_by_review[review_id] = decision_id

    active_approved: dict[str, dict] = {}
    for decision_id, decision in decisions_by_id.items():
        if decision["status"] != "approved" or decision_id in superseded:
            continue
        review_id = decision["review_id"]
        if review_id in active_approved:
            raise RuntimeError(
                f"multiple active catalog v2 decisions for {review_id}"
            )
        active_approved[review_id] = decision

    category_review_ids = {
        candidate["review_id"] for candidate in category_candidates
    }
    effective_approved = {
        review_id: decision
        for review_id, decision in active_approved.items()
        if decision["action"] in DIRECTLY_EFFECTIVE_REVIEW_ACTIONS
    }
    approved_pending_application_ids = sorted(
        set(active_approved) - set(effective_approved)
    )
    return (
        {
            "ledger_id": ledger.get("ledger_id"),
            "decision_count": len(decisions_by_id),
            "active_approved_count": len(active_approved),
            "effective_approved_count": len(effective_approved),
            "approved_pending_application_ids": approved_pending_application_ids,
            "approved_review_ids": sorted(
                review_id
                for review_id in effective_approved
                if review_id not in category_review_ids
            ),
            "approved_category_review_ids": sorted(
                review_id
                for review_id in effective_approved
                if review_id in category_review_ids
            ),
        },
        active_approved,
    )


def candidate_member_keys(candidate: dict) -> set[str]:
    source_key = candidate.get("source_key")
    if isinstance(source_key, str) and source_key:
        return {source_key}
    member_keys = candidate.get("member_keys", "")
    if not isinstance(member_keys, str):
        return set()
    return set(member_keys.split("|")) - {""}


def governed_family_id(category: str, member_keys: set[str]) -> str:
    digest = hashlib.sha256(
        (
            "catalog_decision_engine_v1:"
            + category
            + ":"
            + "|".join(sorted(member_keys))
        ).encode("utf-8")
    ).hexdigest()[:12]
    return f"family-{digest}"


def apply_catalog_decisions(
    records: list[dict],
    baseline_families: list[dict],
    review_rows: list[dict],
    category_candidates: list[dict],
    active_approved_decisions: dict[str, dict],
    source_snapshot_sha256: str,
) -> tuple[list[dict], list[dict], dict[str, str], dict]:
    candidates = {
        item["review_id"]: item for item in [*review_rows, *category_candidates]
    }
    baseline_by_member = {
        member["compound_key"]: family["family_id"]
        for family in baseline_families
        for member in family["members"]
    }
    records_by_key = {record["compound_key"]: record for record in records}
    if set(records_by_key) != set(baseline_by_member):
        raise RuntimeError(
            "catalog v2 baseline records and families do not match"
        )

    decision_keys: dict[str, set[str]] = {}
    action_by_decision_id = {
        decision["decision_id"]: decision["action"]
        for decision in active_approved_decisions.values()
    }
    category_decisions_by_source: dict[str, tuple[str, dict]] = {}
    for review_id, decision in sorted(active_approved_decisions.items()):
        candidate = candidates.get(review_id)
        if not candidate:
            raise RuntimeError(
                f"catalog v2 approved decision candidate is missing: {review_id}"
            )
        keys = candidate_member_keys(candidate)
        if not keys or not keys.issubset(records_by_key):
            raise RuntimeError(
                f"catalog v2 approved decision members are invalid: {review_id}"
            )
        decision_keys[review_id] = keys
        if candidate["review_kind"] == "category_anomaly":
            source_key = next(iter(keys))
            if source_key in category_decisions_by_source:
                raise RuntimeError(
                    f"multiple catalog v2 category decisions for {source_key}"
                )
            category_decisions_by_source[source_key] = (
                review_id,
                decision,
            )
    structural_relationship_keys = set().union(
        *(
            decision_keys[review_id]
            for review_id, decision in active_approved_decisions.items()
            if decision["action"] in {"split_family", "merge_candidate"}
        )
    ) if active_approved_decisions else set()
    category_relationship_overlap = (
        set(category_decisions_by_source) & structural_relationship_keys
    )
    if category_relationship_overlap:
        raise RuntimeError(
            "catalog v2 category and structural-family decisions overlap; "
            "regenerate the relationship review candidates: "
            + ", ".join(sorted(category_relationship_overlap))
        )
    for review_id, decision in sorted(active_approved_decisions.items()):
        candidate = candidates[review_id]
        if candidate["review_kind"] == "category_anomaly":
            continue
        overlap = decision_keys[review_id] & set(category_decisions_by_source)
        if not overlap:
            continue
        if decision["action"] != "confirm_family":
            raise RuntimeError(
                "catalog v2 category decisions may only overlap a "
                f"confirm-family decision: {review_id}"
            )
        overlap_decisions = [
            category_decisions_by_source[source_key][1]
            for source_key in overlap
        ]
        if any(
            category_decision["action"] != "recategorize"
            for category_decision in overlap_decisions
        ):
            raise RuntimeError(
                "catalog v2 overlapping confirm-family and category "
                f"decisions must recategorize every shared source: {review_id}"
            )
        target_categories = {
            (
                category_decisions_by_source[source_key][1][
                    "target_category"
                ].strip()
                if source_key in category_decisions_by_source
                else records_by_key[source_key]["category"]
            )
            for source_key in decision_keys[review_id]
        }
        if len(target_categories) != 1:
            raise RuntimeError(
                "catalog v2 overlapping confirm-family and category "
                f"decisions must converge to one category: {review_id}"
            )

    split_reviews = {
        review_id: decision
        for review_id, decision in active_approved_decisions.items()
        if decision["action"] == "split_family"
    }
    merge_reviews = {
        review_id: decision
        for review_id, decision in active_approved_decisions.items()
        if decision["action"] == "merge_candidate"
    }
    split_keys = set().union(
        *(decision_keys[review_id] for review_id in split_reviews)
    ) if split_reviews else set()
    merge_keys = set().union(
        *(decision_keys[review_id] for review_id in merge_reviews)
    ) if merge_reviews else set()
    if split_keys & merge_keys:
        raise RuntimeError(
            "catalog v2 split and merge decisions overlap; "
            "regenerate the relationship review candidates"
        )
    seen_split_keys: set[str] = set()
    for review_id in sorted(split_reviews):
        overlap = seen_split_keys & decision_keys[review_id]
        if overlap:
            raise RuntimeError(
                "catalog v2 split decisions overlap: "
                + ", ".join(sorted(overlap))
            )
        seen_split_keys.update(decision_keys[review_id])

    effective_records: list[dict] = []
    excluded_sources: list[dict] = []
    category_overrides: list[dict] = []
    for record in records:
        source_key = record["compound_key"]
        category_entry = category_decisions_by_source.get(source_key)
        if not category_entry:
            effective_records.append(record)
            continue
        review_id, decision = category_entry
        if decision["action"] == "exclude_with_disposition":
            excluded_sources.append(
                {
                    "source_key": source_key,
                    "title": record["title"],
                    "baseline_family_id": baseline_by_member[source_key],
                    "disposition": decision["disposition"],
                    "review_id": review_id,
                    "decision_id": decision["decision_id"],
                }
            )
            continue
        if decision["action"] != "recategorize":
            raise RuntimeError(
                f"invalid catalog v2 category action: {decision['decision_id']}"
            )
        derived_record = dict(record)
        derived_record["category"] = decision["target_category"].strip()
        effective_records.append(derived_record)
        category_overrides.append(
            {
                "source_key": source_key,
                "category_before": record["category"],
                "category_after": derived_record["category"],
                "review_id": review_id,
                "decision_id": decision["decision_id"],
            }
        )

    effective_by_key = {
        record["compound_key"]: record for record in effective_records
    }
    excluded_keys = {
        item["source_key"] for item in excluded_sources
    }
    category_decision_id_by_key = {
        source_key: decision["decision_id"]
        for source_key, (_, decision) in category_decisions_by_source.items()
    }

    working_families: list[dict] = []
    for baseline_family in baseline_families:
        baseline_keys = {
            member["compound_key"] for member in baseline_family["members"]
        }
        surviving_keys = baseline_keys & set(effective_by_key)
        if not surviving_keys:
            continue
        members = [effective_by_key[key] for key in sorted(surviving_keys)]
        categories = {member["category"] for member in members}
        changed = (
            surviving_keys != baseline_keys
            or any(key in category_decision_id_by_key for key in baseline_keys)
        )
        if not changed:
            working_families.append(baseline_family)
            continue
        category = (
            next(iter(categories))
            if len(categories) == 1
            else "cross:" + "|".join(sorted(categories))
        )
        applied_ids = sorted(
            {
                category_decision_id_by_key[key]
                for key in baseline_keys
                if key in category_decision_id_by_key
            }
        )
        actions = {
            action_by_decision_id[decision_id]
            for decision_id in applied_ids
        }
        working_families.append(
            assemble_family(
                members,
                governed_family_id(category, surviving_keys),
                (
                    "human_approved_recategorize"
                    if "recategorize" in actions
                    else "human_approved_exclusion"
                ),
                "approved_catalog_decisions:" + ",".join(applied_ids),
                applied_ids,
                allow_category_conflict=len(categories) > 1,
            )
        )

    def member_map(families: list[dict]) -> dict[str, str]:
        return {
            member["compound_key"]: family["family_id"]
            for family in families
            for member in family["members"]
        }

    working_by_id = {
        family["family_id"]: family for family in working_families
    }
    working_member_map = member_map(working_families)
    split_constraints: list[tuple[str, list[set[str]]]] = []
    for review_id, decision in sorted(split_reviews.items()):
        candidate_keys = decision_keys[review_id]
        family_ids = {
            working_member_map.get(source_key)
            for source_key in candidate_keys
        }
        if None in family_ids or len(family_ids) != 1:
            raise RuntimeError(
                f"catalog v2 split candidate is no longer one family: {review_id}"
            )
        source_family_id = next(iter(family_ids))
        source_family = working_by_id[source_family_id]
        source_family_keys = {
            member["compound_key"] for member in source_family["members"]
        }
        if source_family_keys != candidate_keys:
            raise RuntimeError(
                f"catalog v2 split candidate is not a complete family: {review_id}"
            )
        normalized_groups = sorted(
            (
                set(group)
                for group in decision["split_groups"]
            ),
            key=lambda group: tuple(sorted(group)),
        )
        split_constraints.append((review_id, normalized_groups))
        del working_by_id[source_family_id]
        for group in normalized_groups:
            members = [effective_by_key[key] for key in sorted(group)]
            categories = {member["category"] for member in members}
            category = (
                next(iter(categories))
                if len(categories) == 1
                else "cross:" + "|".join(sorted(categories))
            )
            split_family = assemble_family(
                members,
                governed_family_id(category, group),
                "human_approved_split",
                f"approved_catalog_decision:{decision['decision_id']}",
                [decision["decision_id"]],
                allow_category_conflict=len(categories) > 1,
            )
            if split_family["family_id"] in working_by_id:
                raise RuntimeError(
                    f"catalog v2 governed family ID collision: {split_family['family_id']}"
                )
            working_by_id[split_family["family_id"]] = split_family
        working_member_map = member_map(list(working_by_id.values()))

    premerge_families = dict(working_by_id)
    premerge_member_map = member_map(list(premerge_families.values()))
    parent = {family_id: family_id for family_id in premerge_families}

    def find(family_id: str) -> str:
        while parent[family_id] != family_id:
            parent[family_id] = parent[parent[family_id]]
            family_id = parent[family_id]
        return family_id

    def union(left: str, right: str) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            return
        if left_root < right_root:
            parent[right_root] = left_root
        else:
            parent[left_root] = right_root

    merge_family_ids: dict[str, set[str]] = {}
    for review_id in sorted(merge_reviews):
        candidate_keys = decision_keys[review_id]
        family_ids = {
            premerge_member_map.get(source_key)
            for source_key in candidate_keys
        }
        if None in family_ids or len(family_ids) < 2:
            raise RuntimeError(
                f"catalog v2 merge candidate no longer spans families: {review_id}"
            )
        complete_keys = {
            member["compound_key"]
            for family_id in family_ids
            for member in premerge_families[family_id]["members"]
        }
        if complete_keys != candidate_keys:
            raise RuntimeError(
                f"catalog v2 merge candidate is not a complete family union: {review_id}"
            )
        merge_family_ids[review_id] = family_ids
        first_family_id = min(family_ids)
        for family_id in sorted(family_ids - {first_family_id}):
            union(first_family_id, family_id)

    components: dict[str, list[dict]] = defaultdict(list)
    for family_id, family in sorted(premerge_families.items()):
        components[find(family_id)].append(family)
    final_families: list[dict] = []
    for component in components.values():
        if len(component) == 1:
            final_families.append(component[0])
            continue
        component_ids = {family["family_id"] for family in component}
        members = [
            member
            for family in component
            for member in family["members"]
        ]
        categories = {member["category"] for member in members}
        category = (
            next(iter(categories))
            if len(categories) == 1
            else "cross:" + "|".join(sorted(categories))
        )
        applied_ids = sorted(
            merge_reviews[review_id]["decision_id"]
            for review_id, family_ids in merge_family_ids.items()
            if family_ids.issubset(component_ids)
        )
        member_keys = {
            member["compound_key"] for member in members
        }
        final_families.append(
            assemble_family(
                members,
                governed_family_id(category, member_keys),
                "human_approved_merge",
                "approved_catalog_decisions:" + ",".join(applied_ids),
                applied_ids,
                allow_category_conflict=len(categories) > 1,
            )
        )

    final_families.sort(key=lambda family: family["family_id"])
    final_member_map = member_map(final_families)
    if len(final_member_map) != sum(
        family["member_count"] for family in final_families
    ):
        raise RuntimeError("catalog v2 applied model repeats source members")
    if set(final_member_map) != set(effective_by_key):
        raise RuntimeError(
            "catalog v2 applied model loses or invents source members"
        )
    if set(records_by_key) != set(final_member_map) | excluded_keys:
        raise RuntimeError(
            "catalog v2 applied model does not conserve the baseline records"
        )
    if set(final_member_map) & excluded_keys:
        raise RuntimeError(
            "catalog v2 excluded sources remain in the applied model"
        )

    for review_id, decision in sorted(active_approved_decisions.items()):
        action = decision["action"]
        final_ids = {
            final_member_map.get(source_key)
            for source_key in decision_keys[review_id]
            if source_key not in excluded_keys
        }
        if None in final_ids:
            raise RuntimeError(
                f"catalog v2 decision has an unmapped member: {review_id}"
            )
        if action in {"confirm_family", "merge_candidate"} and len(final_ids) != 1:
            raise RuntimeError(
                f"catalog v2 must-link decision was not applied: {review_id}"
            )
        if action == "keep_separate":
            premerge_ids = {
                premerge_member_map[source_key]
                for source_key in decision_keys[review_id]
            }
            if len(final_ids) != len(premerge_ids):
                raise RuntimeError(
                    f"catalog v2 keep-separate constraint was violated: {review_id}"
                )

    for review_id, groups in split_constraints:
        group_family_ids = [
            {
                final_member_map[source_key]
                for source_key in group
            }
            for group in groups
        ]
        if any(len(family_ids) != 1 for family_ids in group_family_ids):
            raise RuntimeError(
                f"catalog v2 split group was fragmented: {review_id}"
            )
        if len({next(iter(ids)) for ids in group_family_ids}) != len(groups):
            raise RuntimeError(
                f"catalog v2 split constraint was violated: {review_id}"
            )

    applied_decision_ids_by_family: dict[str, set[str]] = defaultdict(set)
    for review_id, decision in active_approved_decisions.items():
        for source_key in decision_keys[review_id]:
            family_id = final_member_map.get(source_key)
            if family_id:
                applied_decision_ids_by_family[family_id].add(
                    decision["decision_id"]
                )
    final_families = [
        {
            **family,
            "applied_decision_ids": sorted(
                set(family.get("applied_decision_ids", []))
                | applied_decision_ids_by_family[family["family_id"]]
            ),
        }
        if family["family_id"] in applied_decision_ids_by_family
        else family
        for family in final_families
    ]

    family_signatures: dict[str, tuple[str, ...]] = {}
    for family in final_families:
        signature = tuple(
            sorted(member["compound_key"] for member in family["members"])
        )
        existing = family_signatures.get(family["family_id"])
        if existing is not None and existing != signature:
            raise RuntimeError(
                f"catalog v2 governed family ID collision: {family['family_id']}"
            )
        family_signatures[family["family_id"]] = signature

    source_lineage = []
    for source_key, record in sorted(records_by_key.items()):
        related_decision_ids = sorted(
            decision["decision_id"]
            for review_id, decision in active_approved_decisions.items()
            if source_key in decision_keys[review_id]
        )
        source_lineage.append(
            {
                "source_key": source_key,
                "baseline_family_id": baseline_by_member[source_key],
                "applied_family_id": final_member_map.get(source_key),
                "state": (
                    "excluded" if source_key in excluded_keys else "included"
                ),
                "category_before": record["category"],
                "category_after": (
                    effective_by_key[source_key]["category"]
                    if source_key in effective_by_key
                    else None
                ),
                "applied_decision_ids": related_decision_ids,
            }
        )
    family_lineage = [
        {
            "applied_family_id": family["family_id"],
            "baseline_family_ids": sorted(
                {
                    baseline_by_member[member["compound_key"]]
                    for member in family["members"]
                }
            ),
            "member_keys": sorted(
                member["compound_key"] for member in family["members"]
            ),
            "state": (
                "unchanged"
                if len(
                    {
                        baseline_by_member[member["compound_key"]]
                        for member in family["members"]
                    }
                )
                == 1
                and family["family_id"]
                in {item["family_id"] for item in baseline_families}
                else "derived"
            ),
        }
        for family in final_families
    ]
    active_decision_payload = [
        active_approved_decisions[review_id]
        for review_id in sorted(active_approved_decisions)
    ]
    application = {
        "schema_version": 1,
        "engine_version": "catalog_decision_engine_v1",
        "input_source_snapshot_sha256": source_snapshot_sha256,
        "input_family_model_sha256": family_model_sha256(
            baseline_families
        ),
        "active_decision_set_sha256": stable_json_sha256(
            active_decision_payload
        ),
        "output_family_model_sha256": family_model_sha256(final_families),
        "input_source_count": len(records),
        "included_source_count": len(final_member_map),
        "excluded_source_count": len(excluded_sources),
        "input_family_count": len(baseline_families),
        "output_family_count": len(final_families),
        "active_approved_decision_ids": sorted(
            decision["decision_id"]
            for decision in active_approved_decisions.values()
        ),
        "applied_review_ids": sorted(active_approved_decisions),
        "action_counts": dict(
            sorted(
                Counter(
                    decision["action"]
                    for decision in active_approved_decisions.values()
                ).items()
            )
        ),
        "category_overrides": sorted(
            category_overrides, key=lambda item: item["source_key"]
        ),
        "excluded_sources": sorted(
            excluded_sources, key=lambda item: item["source_key"]
        ),
        "source_lineage": source_lineage,
        "family_lineage": family_lineage,
        "source_files_modified": False,
    }
    application["decision_application_sha256"] = stable_json_sha256(
        application
    )
    return (
        effective_records,
        final_families,
        final_member_map,
        application,
    )


def release_batch_family_ids(
    batch: dict,
    sample_family_ids: list[str],
    all_family_ids: set[str],
) -> list[str]:
    selection = batch.get("family_selection", {})
    if selection.get("artifact") == "product-sample-batch-120.json":
        return sample_family_ids
    if selection.get("scope") == "all_derived_families":
        return sorted(all_family_ids)
    return batch.get("family_ids", [])


def validate_release_batch(
    root: Path,
    source_snapshot_sha256: str,
    sample_family_ids: list[str],
    all_family_ids: set[str],
    all_source_member_count: int,
    all_source_member_keys: set[str],
    decision_application_sha256: str,
    applied_family_model_sha256: str,
) -> tuple[dict, list[str], dict[str, tuple[dict, list[str]]]]:
    path = (
        root
        / "content"
        / "governance"
        / "product-catalog-v2-release-batches.json"
    )
    if not path.exists():
        raise RuntimeError(f"missing human-owned release batch ledger: {path}")
    ledger = json.loads(path.read_text(encoding="utf-8"))
    if ledger.get("schema_version") != 1:
        raise RuntimeError("catalog v2 release batch schema_version must be 1")
    batches = ledger.get("batches")
    if not isinstance(batches, list) or not batches:
        raise RuntimeError("catalog v2 release batch ledger is empty")
    batch_ids = [batch.get("batch_id") for batch in batches]
    if len(set(batch_ids)) != len(batch_ids):
        raise RuntimeError("catalog v2 release batch IDs must be unique")

    batches_by_id: dict[str, tuple[dict, list[str]]] = {}
    for batch in batches:
        if batch.get("source_snapshot_sha256") != source_snapshot_sha256:
            raise RuntimeError(
                f"catalog v2 release batch source is stale: {batch.get('batch_id')}"
            )
        selection = batch.get("family_selection", {})
        family_ids = release_batch_family_ids(
            batch,
            sample_family_ids,
            all_family_ids,
        )
        if not isinstance(family_ids, list) or not family_ids:
            raise RuntimeError(
                f"catalog v2 release batch has no families: {batch.get('batch_id')}"
            )
        if len(set(family_ids)) != len(family_ids):
            raise RuntimeError(
                f"catalog v2 release batch repeats families: {batch.get('batch_id')}"
            )
        if not set(family_ids).issubset(all_family_ids):
            raise RuntimeError(
                f"catalog v2 release batch contains unknown families: {batch.get('batch_id')}"
            )
        expected_hash = stable_json_sha256(sorted(family_ids))
        if selection.get("family_set_sha256") != expected_hash:
            raise RuntimeError(
                f"catalog v2 release batch family set is stale: {batch.get('batch_id')}"
            )
        if selection.get("expected_count") != len(family_ids):
            raise RuntimeError(
                f"catalog v2 release batch count is stale: {batch.get('batch_id')}"
            )
        if selection.get("scope") == "all_derived_families":
            if (
                selection.get("expected_source_member_count")
                != all_source_member_count
            ):
                raise RuntimeError(
                    "catalog v2 full release batch source-member count is stale: "
                    + str(batch.get("batch_id"))
                )
            if selection.get("member_set_sha256") != stable_json_sha256(
                sorted(all_source_member_keys)
            ):
                raise RuntimeError(
                    "catalog v2 full release batch source-member set is stale: "
                    + str(batch.get("batch_id"))
                )
            model = batch.get("model", {})
            if (
                model.get("decision_application_sha256")
                != decision_application_sha256
                or model.get("applied_family_model_sha256")
                != applied_family_model_sha256
            ):
                raise RuntimeError(
                    "catalog v2 full release batch decision model is stale: "
                    + str(batch.get("batch_id"))
                )
        if batch.get("state") not in {
            "draft",
            "validated",
            "approved",
            "emitted",
            "deployed",
            "retired",
        }:
            raise RuntimeError(
                f"catalog v2 release batch state is invalid: {batch.get('batch_id')}"
            )
        controls = batch.get("controls", {})
        target_visibility = batch.get("target_visibility")
        if target_visibility == "private_noindex":
            if (
                controls.get("robots_index") is not False
                or controls.get("sitemap_included") is not False
                or controls.get("alias_activation") != "disabled"
            ):
                raise RuntimeError(
                    f"private catalog v2 release controls are unsafe: {batch.get('batch_id')}"
                )
        elif target_visibility == "public_indexable":
            if (
                controls.get("robots_index") is not True
                or controls.get("sitemap_included") is not True
                or controls.get("alias_activation") != "approved"
            ):
                raise RuntimeError(
                    f"public catalog v2 release controls are incomplete: {batch.get('batch_id')}"
                )
            if batch.get("state") == "draft" and (
                batch.get("approved_by") is not None
                or batch.get("approved_at") is not None
            ):
                raise RuntimeError(
                    f"draft public catalog v2 release has a signoff: {batch.get('batch_id')}"
                )
            if batch.get("state") in {"approved", "emitted", "deployed"} and (
                not isinstance(batch.get("approved_by"), str)
                or not batch["approved_by"].strip()
                or not isinstance(batch.get("approved_at"), str)
                or not batch["approved_at"].strip()
            ):
                raise RuntimeError(
                    f"public catalog v2 release lacks signoff: {batch.get('batch_id')}"
                )
        else:
            raise RuntimeError(
                f"catalog v2 release visibility is invalid: {batch.get('batch_id')}"
            )
        batches_by_id[batch["batch_id"]] = (batch, family_ids)

    active_batch_id = ledger.get("active_batch_id")
    if active_batch_id not in batches_by_id:
        raise RuntimeError("catalog v2 active release batch is missing")
    active_batch, active_family_ids = batches_by_id[active_batch_id]
    return active_batch, active_family_ids, batches_by_id


def normalized_catalog_media_path(value: str) -> str:
    parsed = urlsplit(value)
    return parsed.path if parsed.scheme and parsed.netloc else value


def authorized_catalog_media_paths(root: Path) -> set[str]:
    batches = json.loads(
        (
            root
            / "content"
            / "governance"
            / "media-authorization-batches.json"
        ).read_text(encoding="utf-8")
    )
    expected_domain = urlsplit(CATALOG_IMAGE_ORIGIN).netloc
    approved_batch_paths: dict[str, set[str]] = {}
    for batch in batches:
        batch_id = batch.get("batch_id")
        if (
            not isinstance(batch_id, str)
            or batch.get("authorization_status") != "approved"
            or batch.get("source_domain") != expected_domain
        ):
            continue
        source_paths = set()
        for value in batch.get("source_urls", []):
            if not isinstance(value, str):
                continue
            parsed = urlsplit(value)
            if (
                parsed.scheme in {"http", "https"}
                and parsed.netloc == expected_domain
                and parsed.path.startswith(CATALOG_IMAGE_PATH_PREFIX)
                and not parsed.query
                and not parsed.fragment
            ):
                source_paths.add(parsed.path)
        if source_paths:
            approved_batch_paths[batch_id] = source_paths
    inventory = json.loads(
        (
            root / "content" / "governance" / "media-inventory.json"
        ).read_text(encoding="utf-8")
    )
    authorized_paths = set()
    for item in inventory:
        if (
            item.get("publish_allowed") is not True
            or item.get("rights_status") != "approved"
            or item.get("authorization_batch_id") not in approved_batch_paths
        ):
            continue
        batch_paths = approved_batch_paths[item["authorization_batch_id"]]
        for value in (
            item.get("asset_url"),
            item.get("normalized_source_url"),
        ):
            if not value:
                continue
            parsed = urlsplit(value)
            if (
                f"{parsed.scheme}://{parsed.netloc}" == CATALOG_IMAGE_ORIGIN
                and parsed.path.startswith(CATALOG_IMAGE_PATH_PREFIX)
                and not parsed.query
                and not parsed.fragment
                and parsed.path in batch_paths
            ):
                authorized_paths.add(parsed.path)
    return authorized_paths


def detail_media_authorization(
    detail_payloads: dict[str, dict],
    authorized_paths: set[str],
    include_unauthorized_paths: bool = True,
) -> dict:
    displayed_paths = {
        path
        for detail in detail_payloads.values()
        for path in [
            detail["representative_detail"]["primary_image"],
            *detail["representative_detail"]["detail_images"],
        ]
        if path
    }
    unauthorized = sorted(displayed_paths - authorized_paths)
    authorization = {
        "family_count": len(detail_payloads),
        "unique_media_paths": len(displayed_paths),
        "authorized_media_paths": len(displayed_paths & authorized_paths),
        "unauthorized_media_path_count": len(unauthorized),
        "unauthorized_media_paths_sha256": stable_json_sha256(unauthorized),
    }
    if include_unauthorized_paths:
        authorization["unauthorized_media_paths"] = unauthorized
    return authorization


def sample_media_authorization(
    root: Path,
    detail_payloads: dict[str, dict],
) -> dict:
    return detail_media_authorization(
        detail_payloads,
        authorized_catalog_media_paths(root),
    )


def full_release_batch(
    batches_by_id: dict[str, tuple[dict, list[str]]],
) -> tuple[dict, list[str]]:
    candidates = [
        entry
        for entry in batches_by_id.values()
        if entry[0].get("family_selection", {}).get("scope")
        == "all_derived_families"
    ]
    if len(candidates) != 1:
        raise RuntimeError(
            "catalog v2 requires exactly one full all-derived-families release batch"
        )
    return candidates[0]


def build_full_release_readiness(
    full_batch: dict,
    full_batch_family_ids: list[str],
    active_batch_id: str,
    families: list[dict],
    review_rows: list[dict],
    category_candidates: list[dict],
    decision_summary: dict,
    decision_application: dict,
    source_snapshot_sha256: str,
    authorized_paths: set[str],
    public_route_contract: dict,
    public_runtime: dict,
) -> dict:
    family_by_id = {family["family_id"]: family for family in families}
    all_family_ids = set(family_by_id)
    batch_family_ids = set(full_batch_family_ids)
    if batch_family_ids != all_family_ids:
        raise RuntimeError("catalog v2 full release batch does not cover every family")

    full_detail_payloads = {
        family_id: family_detail_payload(family_by_id[family_id])
        for family_id in full_batch_family_ids
    }
    media_authorization = detail_media_authorization(
        full_detail_payloads,
        authorized_paths,
        include_unauthorized_paths=False,
    )
    required_review_ids = sorted(
        row["review_id"] for row in review_rows
    )
    approved_review_ids = set(decision_summary["approved_review_ids"])
    unresolved_review_ids = sorted(
        set(required_review_ids) - approved_review_ids
    )
    required_category_review_ids = sorted(
        candidate["review_id"] for candidate in category_candidates
    )
    approved_category_review_ids = set(
        decision_summary["approved_category_review_ids"]
    )
    unresolved_category_review_ids = sorted(
        set(required_category_review_ids) - approved_category_review_ids
    )
    cross_category_families = [
        family
        for family in sorted(families, key=lambda item: item["family_id"])
        if family["category_state"] == "pending_owner_selection"
    ]
    public_routes_by_family = {
        route["family_id"]: route
        for route in public_route_contract["entries"]
    }
    route_pending_family_ids = [
        family["family_id"]
        for family in sorted(families, key=lambda item: item["family_id"])
        if not public_routes_by_family.get(family["family_id"], {}).get(
            "canonical_path"
        )
    ]
    cross_category_without_neutral_route = [
        family["family_id"]
        for family in cross_category_families
        if public_routes_by_family.get(family["family_id"], {}).get(
            "route_kind"
        )
        != "neutral_catalog_series"
    ]
    public_media = {
        "emitted_media_path_count": sum(
            item["media"]["emitted_media_count"]
            for item in public_runtime["items"]
        ),
        "suppressed_source_media_path_count": media_authorization[
            "unique_media_paths"
        ],
    }
    public_media["emitted_unauthorized_media_path_count"] = 0
    if public_media["emitted_media_path_count"]:
        raise RuntimeError("public catalog runtime must not emit source media")
    controls = full_batch["controls"]
    full_batch_signed = (
        full_batch["state"] in {"approved", "emitted", "deployed"}
        and bool(full_batch.get("approved_by"))
        and bool(full_batch.get("approved_at"))
    )
    full_public_runtime_emitted = (
        public_runtime.get("publication_state")
        in {"prepared_noindex", "active_public_indexable"}
        and len(public_runtime.get("items", [])) == len(families)
        and public_media["emitted_media_path_count"] == 0
    )
    public_release_eligible = (
        full_batch["batch_id"] == active_batch_id
        and full_batch["target_visibility"] == "public_indexable"
        and full_batch_signed
        and not unresolved_review_ids
        and not unresolved_category_review_ids
        and not cross_category_without_neutral_route
        and not route_pending_family_ids
        and public_media["emitted_unauthorized_media_path_count"] == 0
        and not decision_summary["approved_pending_application_ids"]
        and full_public_runtime_emitted
        and controls.get("robots_index") is True
        and controls.get("sitemap_included") is True
        and controls.get("alias_activation") == "approved"
    )
    blockers = [
        *(
            ["full_release_batch_not_active"]
            if full_batch["batch_id"] != active_batch_id
            else []
        ),
        *(
            ["full_release_batch_not_signed"]
            if not full_batch_signed
            else []
        ),
        *(
            [f"{len(unresolved_review_ids)}_family_reviews_unresolved"]
            if unresolved_review_ids
            else []
        ),
        *(
            [
                f"{len(unresolved_category_review_ids)}_category_reviews_unresolved"
            ]
            if unresolved_category_review_ids
            else []
        ),
        *(
            [
                f"{len(cross_category_without_neutral_route)}_cross_category_neutral_route_contract_missing"
            ]
            if cross_category_without_neutral_route
            else []
        ),
        *(
            [f"{len(route_pending_family_ids)}_canonical_routes_pending"]
            if route_pending_family_ids
            else []
        ),
        *(
            [
                f"{public_media['emitted_unauthorized_media_path_count']}_unauthorized_media_paths_emitted"
            ]
            if public_media["emitted_unauthorized_media_path_count"]
            else []
        ),
        *(
            [
                f"{len(decision_summary['approved_pending_application_ids'])}_approved_decisions_pending_application"
            ]
            if decision_summary["approved_pending_application_ids"]
            else []
        ),
        *(
            ["full_public_runtime_not_emitted"]
            if not full_public_runtime_emitted
            else []
        ),
    ]
    return {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "source_snapshot_sha256": source_snapshot_sha256,
        "batch_id": full_batch["batch_id"],
        "purpose": full_batch["purpose"],
        "target_visibility": full_batch["target_visibility"],
        "state": full_batch["state"],
        "active_batch_id": active_batch_id,
        "family_count": len(full_batch_family_ids),
        "source_member_count": sum(
            family["member_count"] for family in families
        ),
        "family_set_sha256": stable_json_sha256(
            sorted(full_batch_family_ids)
        ),
        "member_set_sha256": stable_json_sha256(
            sorted(
                member["compound_key"]
                for family in families
                for member in family["members"]
            )
        ),
        "full_batch_coverage_exact": batch_family_ids == all_family_ids,
        "relationship_reviews": {
            "required_count": len(required_review_ids),
            "unresolved_review_ids": unresolved_review_ids,
            "approved_count": len(required_review_ids)
            - len(unresolved_review_ids),
        },
        "category_anomaly_reviews": {
            "required_count": len(required_category_review_ids),
            "unresolved_review_ids": unresolved_category_review_ids,
            "approved_count": len(required_category_review_ids)
            - len(unresolved_category_review_ids),
        },
        "cross_category_owner_selection": {
            "required_count": len(cross_category_families),
            "publication_policy": "neutral_catalog_series_without_forced_primary_category",
            "neutral_route_contract_complete": not cross_category_without_neutral_route,
            "pending_family_ids": [
                family["family_id"] for family in cross_category_families
            ],
            "families": [
                {
                    "family_id": family["family_id"],
                    "title": family["title"],
                    "source_categories": family["source_categories"],
                    "member_count": family["member_count"],
                    "route_plan_state": family["route_plan_state"],
                }
                for family in cross_category_families
            ],
        },
        "canonical_route_readiness": {
            "route_ready_family_count": len(families)
            - len(route_pending_family_ids),
            "route_pending_family_count": len(route_pending_family_ids),
            "pending_family_ids": route_pending_family_ids,
            "route_strategy": public_route_contract["strategy"],
        },
        "media_authorization": {
            **media_authorization,
            "public_projection": public_media,
            "public_media_policy": public_route_contract["media_policy"],
        },
        "decision_application": {
            "decision_application_sha256": decision_application[
                "decision_application_sha256"
            ],
            "approved_pending_application_ids": decision_summary[
                "approved_pending_application_ids"
            ],
        },
        "public_runtime": {
            "emitted": full_public_runtime_emitted,
            "publication_state": public_runtime["publication_state"],
            "catalog_count": len(public_runtime["items"]),
            "reason": (
                "catalog_release_controls_satisfied"
                if public_runtime["publication_state"]
                == "active_public_indexable"
                else "safe_public_projection_prepared_but_batch_is_not_active"
            ),
        },
        "controls": controls,
        "public_release_eligible": public_release_eligible,
        "blockers": blockers,
        "publication_boundary": (
            "active_public_runtime_generated_not_deployed"
            if public_release_eligible
            else "draft_full_release_specification_only_not_active_not_deployed"
        ),
    }


def family_media_authorization(
    detail: dict,
    authorized_paths: set[str],
) -> dict:
    primary_image = detail["representative_detail"]["primary_image"]
    display_paths = list(
        dict.fromkeys(
            path
            for path in [
                primary_image,
                *detail["representative_detail"]["detail_images"],
            ]
            if path
        )
    )
    authorized = [path for path in display_paths if path in authorized_paths]
    unauthorized = [path for path in display_paths if path not in authorized_paths]
    return {
        "primary_image": primary_image,
        "primary_image_authorized": bool(
            primary_image and primary_image in authorized_paths
        ),
        "display_media_count": len(display_paths),
        "authorized_media_count": len(authorized),
        "unauthorized_media_count": len(unauthorized),
        "fully_authorized": bool(display_paths) and not unauthorized,
        "authorized_media_paths": authorized,
        "unauthorized_media_paths": unauthorized,
    }


def review_member_payload(
    record: dict,
    member_to_family: dict[str, str],
    active_batch_family_ids: set[str],
) -> dict:
    family_id = member_to_family[record["compound_key"]]
    return {
        "source_key": record["compound_key"],
        "display_id": record["display_id"],
        "title": record["title"],
        "category": record["category"],
        "current_family_id": family_id,
        "in_active_batch": family_id in active_batch_family_ids,
        "primary_image": runtime_image_path(record["primary_image"]),
        "source_path": record["source_path"],
        "source_sha256": record["source_sha256"],
        "dimensions": variant_dimensions(record),
        "quality_flags": quality_flags(record),
    }


def review_action_payload_schema(action: str) -> dict:
    if action == "split_family":
        return {
            "required": ["split_groups"],
            "split_groups": (
                "two_or_more_nonempty_groups_that_partition_all_candidate_members"
            ),
            "application": "requires_catalog_family_rebuild",
        }
    if action == "recategorize":
        return {
            "required": ["target_category"],
            "target_category": "existing_verified_category",
            "application": "requires_catalog_category_rebuild",
        }
    if action == "exclude_with_disposition":
        return {
            "required": ["disposition"],
            "allowed_dispositions": sorted(REVIEW_ALLOWED_DISPOSITIONS),
            "application": "requires_catalog_scope_rebuild",
        }
    if action == "merge_candidate":
        return {
            "required": [],
            "member_set": "candidate_sha256_locked",
            "application": "requires_catalog_family_rebuild",
        }
    return {
        "required": [],
        "application": "effective_without_structural_rebuild",
    }


def build_review_workbench(
    review_rows: list[dict],
    category_candidates: list[dict],
    records: list[dict],
    member_to_family: dict[str, str],
    active_batch: dict,
    active_batch_family_ids: list[str],
    required_review_ids: list[str],
    unresolved_review_ids: list[str],
    required_category_review_ids: list[str],
    blocking_category_review_ids: list[str],
    active_approved_decisions: dict[str, dict],
    source_snapshot_sha256: str,
    derived_family_model_sha256: str,
    decision_ledger_sha256: str,
) -> dict:
    record_by_key = {record["compound_key"]: record for record in records}
    required_ids = set(required_review_ids)
    unresolved_ids = set(unresolved_review_ids)
    required_category_ids = set(required_category_review_ids)
    blocking_category_ids = set(blocking_category_review_ids)
    active_family_ids = set(active_batch_family_ids)
    required_rows = [
        row for row in review_rows if row["review_id"] in required_ids
    ]
    row_member_sets = {
        row["review_id"]: set(row["member_keys"].split("|"))
        for row in required_rows
    }
    member_reference_counts = Counter(
        source_key
        for member_keys in row_member_sets.values()
        for source_key in member_keys
    )
    adjacency = {
        review_id: {
            other_review_id
            for other_review_id, other_member_keys in row_member_sets.items()
            if other_review_id != review_id
            and member_keys & other_member_keys
        }
        for review_id, member_keys in row_member_sets.items()
    }
    connected_clusters = []
    unseen = set(adjacency)
    while unseen:
        seed = unseen.pop()
        cluster = {seed}
        frontier = [seed]
        while frontier:
            current = frontier.pop()
            for neighbor in adjacency[current]:
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    cluster.add(neighbor)
                    frontier.append(neighbor)
        if len(cluster) > 1:
            connected_clusters.append(sorted(cluster))
    items = []

    for row in required_rows:
        members = [
            review_member_payload(
                record_by_key[source_key],
                member_to_family,
                active_family_ids,
            )
            for source_key in row["member_keys"].split("|")
        ]
        active_decision = active_approved_decisions.get(row["review_id"])
        machine_state = (
            "pending"
            if row["review_id"] in unresolved_ids
            else "approved"
        )
        if active_decision and machine_state == "pending":
            machine_state = "approved_pending_application"
        affected_family_ids = sorted(
            {member["current_family_id"] for member in members}
        )
        related_review_ids = sorted(
            other_review_id
            for other_review_id, other_member_keys in row_member_sets.items()
            if other_review_id != row["review_id"]
            and row_member_sets[row["review_id"]] & other_member_keys
        )
        action_payload_schemas = {
            action: review_action_payload_schema(action)
            for action in sorted(
                REVIEW_ALLOWED_ACTIONS[row["review_kind"]]
            )
        }
        items.append(
            {
                "review_id": row["review_id"],
                "review_kind": row["review_kind"],
                "candidate_sha256": row["candidate_sha256"],
                "source_snapshot_sha256": source_snapshot_sha256,
                "machine_state": machine_state,
                "title": (
                    f"{row['model_signature']} 型号关系"
                    if row["review_kind"] == "merge_candidate"
                    else f"{row['category']}产品族确认"
                ),
                "category": row["category"],
                "model_signature": row["model_signature"],
                "evidence_type": row["evidence_type"],
                "suggested_action": row["suggested_action"],
                "allowed_actions": sorted(
                    REVIEW_ALLOWED_ACTIONS[row["review_kind"]]
                ),
                "action_payload_schemas": action_payload_schemas,
                "member_count": row["member_count"],
                "members": members,
                "affected_family_ids": affected_family_ids,
                "active_batch_family_ids": sorted(
                    set(affected_family_ids) & active_family_ids
                ),
                "related_review_ids": related_review_ids,
                "release_impact": (
                    "structural_action_requires_rebuild_before_gate_clears"
                    if any(
                        action not in DIRECTLY_EFFECTIVE_REVIEW_ACTIONS
                        for action in REVIEW_ALLOWED_ACTIONS[
                            row["review_kind"]
                        ]
                    )
                    else "decision_can_clear_gate_without_structural_rebuild"
                ),
                "active_decision_id": (
                    active_decision["decision_id"] if active_decision else None
                ),
            }
        )

    for candidate in category_candidates:
        if candidate["review_id"] not in required_category_ids:
            continue
        record = record_by_key[candidate["source_key"]]
        active_decision = active_approved_decisions.get(candidate["review_id"])
        machine_state = (
            "pending"
            if candidate["review_id"] in blocking_category_ids
            else "approved"
        )
        if active_decision and machine_state == "pending":
            machine_state = "approved_pending_application"
        member = review_member_payload(
            record,
            member_to_family,
            active_family_ids,
        )
        items.append(
            {
                "review_id": candidate["review_id"],
                "review_kind": candidate["review_kind"],
                "candidate_sha256": candidate["candidate_sha256"],
                "source_snapshot_sha256": source_snapshot_sha256,
                "machine_state": machine_state,
                "title": candidate["title"],
                "category": candidate["source_category"],
                "model_signature": "",
                "evidence_type": "literal_source_category_anomaly",
                "suggested_action": "recategorize_or_exclude_with_disposition",
                "allowed_actions": sorted(
                    REVIEW_ALLOWED_ACTIONS[candidate["review_kind"]]
                ),
                "action_payload_schemas": {
                    action: review_action_payload_schema(action)
                    for action in sorted(
                        REVIEW_ALLOWED_ACTIONS[
                            candidate["review_kind"]
                        ]
                    )
                },
                "member_count": 1,
                "members": [member],
                "affected_family_ids": [member["current_family_id"]],
                "active_batch_family_ids": (
                    [member["current_family_id"]]
                    if member["in_active_batch"]
                    else []
                ),
                "related_review_ids": sorted(
                    review_id
                    for review_id, member_keys in row_member_sets.items()
                    if candidate["source_key"] in member_keys
                ),
                "release_impact": (
                    "structural_action_requires_rebuild_before_gate_clears"
                ),
                "active_decision_id": (
                    active_decision["decision_id"] if active_decision else None
                ),
            }
        )

    kind_order = {
        "category_anomaly": 0,
        "confirm_auto_family": 1,
        "merge_candidate": 2,
    }
    items.sort(
        key=lambda item: (
            item["machine_state"] != "pending",
            kind_order[item["review_kind"]],
            item["category"],
            item["review_id"],
        )
    )
    return {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "source_snapshot_sha256": source_snapshot_sha256,
        "derived_family_model_sha256": derived_family_model_sha256,
        "batch_id": active_batch["batch_id"],
        "active_batch_family_set_sha256": stable_json_sha256(
            sorted(active_batch_family_ids)
        ),
        "decision_ledger_sha256": decision_ledger_sha256,
        "visibility": "local_review_only_production_disabled_by_default",
        "ownership": "human_decisions_exported_separately",
        "verified_categories": sorted(
            {
                record["category"]
                for record in records
                if record["category"] not in {"类别", "待复核"}
            }
        ),
        "allowed_dispositions": sorted(REVIEW_ALLOWED_DISPOSITIONS),
        "counts": {
            "total": len(items),
            "pending": sum(
                item["machine_state"] in {
                    "pending",
                    "approved_pending_application",
                }
                for item in items
            ),
            "approved": sum(
                item["machine_state"] == "approved" for item in items
            ),
            "approved_pending_application": sum(
                item["machine_state"] == "approved_pending_application"
                for item in items
            ),
            "confirm_auto_family": sum(
                item["review_kind"] == "confirm_auto_family" for item in items
            ),
            "merge_candidate": sum(
                item["review_kind"] == "merge_candidate" for item in items
            ),
            "category_anomaly": sum(
                item["review_kind"] == "category_anomaly" for item in items
            ),
            "shared_member_source_keys": sum(
                count > 1 for count in member_reference_counts.values()
            ),
            "linked_review_clusters": len(connected_clusters),
        },
        "linked_review_clusters": sorted(connected_clusters),
        "review_items": items,
    }


def build_public_pilot_candidates(
    sample_families: list[dict],
    detail_payloads: dict[str, dict],
    review_rows: list[dict],
    category_candidates: list[dict],
    route_aliases: list[dict],
    unresolved_review_ids: list[str],
    blocking_category_review_ids: list[str],
    active_batch: dict,
    source_snapshot_sha256: str,
    derived_family_model_sha256: str,
    authorized_paths: set[str],
) -> dict:
    unresolved_ids = set(unresolved_review_ids)
    blocking_category_ids = set(blocking_category_review_ids)
    category_by_source_key = {
        candidate["source_key"]: candidate
        for candidate in category_candidates
    }
    review_by_id = {row["review_id"]: row for row in review_rows}
    aliases_by_family_id: dict[str, list[str]] = defaultdict(list)
    for alias in route_aliases:
        family_id = alias.get("family_id")
        if family_id:
            aliases_by_family_id[family_id].append(alias["legacy_route"])
    candidates = []

    for family in sample_families:
        family_id = family["family_id"]
        member_keys = {
            member["compound_key"] for member in family["members"]
        }
        media = family_media_authorization(
            detail_payloads[family_id],
            authorized_paths,
        )
        if not media["primary_image_authorized"]:
            continue
        family_review_ids = sorted(
            row["review_id"]
            for row in review_rows
            if member_keys & set(row["member_keys"].split("|"))
        )
        category_review_ids = sorted(
            category_by_source_key[source_key]["review_id"]
            for source_key in member_keys
            if source_key in category_by_source_key
        )
        unresolved_family_ids = sorted(
            set(family_review_ids) & unresolved_ids
        )
        unresolved_category_ids = sorted(
            set(category_review_ids) & blocking_category_ids
        )
        stable_family_actions = {
            review_id: (
                "keep_separate"
                if review_by_id[review_id]["review_kind"]
                == "merge_candidate"
                else "confirm_family"
            )
            for review_id in unresolved_family_ids
        }
        media["unauthorized_media_paths_sha256"] = stable_json_sha256(
            media["unauthorized_media_paths"]
        )
        candidates.append(
            {
                "family_id": family_id,
                "title": family["title"],
                "category": family["category"],
                "member_count": family["member_count"],
                "representative_score": family["representative_score"],
                "representative": {
                    "source_key": family["representative"]["compound_key"],
                    "display_id": family["representative"]["display_id"],
                    "primary_image": media["primary_image"],
                },
                "media": media,
                "governance": {
                    "required_review_ids": family_review_ids,
                    "unresolved_review_ids": unresolved_family_ids,
                    "required_category_review_ids": category_review_ids,
                    "unresolved_category_review_ids": unresolved_category_ids,
                    "family_id_stability_requires_actions": (
                        stable_family_actions
                    ),
                },
                "legacy_aliases": sorted(aliases_by_family_id[family_id]),
                "legacy_alias_count": len(aliases_by_family_id[family_id]),
                "release_ready": False,
                "candidate_state": (
                    "full_media_candidate_pending_release_signoff"
                    if (
                        media["fully_authorized"]
                        and not unresolved_family_ids
                        and not unresolved_category_ids
                    )
                    else (
                        "primary_only_candidate_pending_release_signoff"
                        if (
                            not unresolved_family_ids
                            and not unresolved_category_ids
                        )
                        else "candidate_pending_product_review"
                    )
                ),
            }
        )

    candidates.sort(
        key=lambda item: (
            not item["media"]["fully_authorized"],
            len(item["governance"]["unresolved_category_review_ids"])
            + len(item["governance"]["unresolved_review_ids"]),
            -(
                item["media"]["authorized_media_count"]
                / max(item["media"]["display_media_count"], 1)
            ),
            -item["representative_score"],
            item["category"],
            item["family_id"],
        )
    )
    for rank, item in enumerate(candidates, start=1):
        item["candidate_rank"] = rank

    fully_authorized = sum(
        item["media"]["fully_authorized"] for item in candidates
    )
    decision_clear = sum(
        not item["governance"]["unresolved_review_ids"]
        and not item["governance"]["unresolved_category_review_ids"]
        for item in candidates
    )
    return {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "source_snapshot_sha256": source_snapshot_sha256,
        "derived_family_model_sha256": derived_family_model_sha256,
        "source_batch_id": active_batch["batch_id"],
        "status": "advisory_only_not_release_batch",
        "selection_policy": (
            "active_sample_families_with_authorized_primary_image_ranked_by_"
            "full_media_review_burden_authorized_ratio_and_source_quality"
        ),
        "release_constraints": {
            "human_family_and_category_decisions_required": True,
            "primary_authorization_does_not_authorize_detail_media": True,
            "unauthorized_detail_media_must_be_suppressed_or_authorized": True,
            "public_batch_requires_separate_signed_release_specification": True,
        },
        "counts": {
            "active_sample_families": len(sample_families),
            "authorized_primary_candidates": len(candidates),
            "fully_media_authorized_candidates": fully_authorized,
            "decision_clear_candidates": decision_clear,
            "release_ready_candidates": 0,
            "categories_covered": len(
                {item["category"] for item in candidates}
            ),
            "legacy_aliases_covered": sum(
                item["legacy_alias_count"] for item in candidates
            ),
        },
        "suggested_first_pilot_range": {
            "minimum": min(12, len(candidates)),
            "maximum": min(18, len(candidates)),
            "condition": "only_after_required_product_decisions_and_media_scope_are_signed",
        },
        "candidates": candidates,
    }


def build_private_pilot_preview(
    pilot_candidates: dict,
    source_snapshot_sha256: str,
    applied_family_model_sha256: str,
) -> dict:
    candidates = pilot_candidates["candidates"]
    review_to_candidate_ids: dict[str, set[str]] = defaultdict(set)
    for candidate in candidates:
        for review_id in [
            *candidate["governance"]["required_review_ids"],
            *candidate["governance"]["required_category_review_ids"],
        ]:
            review_to_candidate_ids[review_id].add(candidate["family_id"])

    tiers = []
    for limit in [1, 14, 17, 18, 22]:
        if limit > len(candidates):
            continue
        selected = candidates[:limit]
        family_ids = [item["family_id"] for item in selected]
        selected_ids = set(family_ids)
        referenced_review_ids = {
            review_id
            for item in selected
            for review_id in [
                *item["governance"]["required_review_ids"],
                *item["governance"]["required_category_review_ids"],
            ]
        }
        cut_review_ids = sorted(
            review_id
            for review_id in referenced_review_ids
            if not review_to_candidate_ids[review_id].issubset(selected_ids)
        )
        authorized_media_paths = {
            path
            for item in selected
            for path in item["media"]["authorized_media_paths"]
        }
        suppressed_media_paths = {
            path
            for item in selected
            for path in item["media"]["unauthorized_media_paths"]
        }
        legacy_aliases = {
            route
            for item in selected
            for route in item["legacy_aliases"]
        }
        tiers.append(
            {
                "tier_id": f"private-pilot-top-{limit}",
                "purpose": (
                    "local_proxy_and_runtime_smoke_test"
                    if limit == 1
                    else (
                        "recommended_relationship_closed_private_review"
                        if limit == 18
                        else "advisory_private_review_option"
                    )
                ),
                "candidate_rank_limit": limit,
                "family_ids": family_ids,
                "family_set_sha256": stable_json_sha256(
                    sorted(family_ids)
                ),
                "authorized_media_path_count": len(
                    authorized_media_paths
                ),
                "suppressed_media_path_count": len(
                    suppressed_media_paths
                ),
                "legacy_alias_preview_count": len(legacy_aliases),
                "candidate_pool_relationship_closed": not cut_review_ids,
                "cut_review_ids": cut_review_ids,
                "target_visibility": "private_noindex",
                "alias_activation": False,
                "release_ready": False,
            }
        )
    return {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "source_snapshot_sha256": source_snapshot_sha256,
        "applied_family_model_sha256": applied_family_model_sha256,
        "status": "advisory_only_not_active_release_batch",
        "active_release_batch_modified": False,
        "human_decisions_created": False,
        "runtime_media_policy": "authorized_paths_only",
        "recommended_sequence": [
            "private-pilot-top-1",
            "private-pilot-top-18",
        ],
        "tiers": tiers,
    }


def media_review_csv_text(
    sample_families: list[dict],
    detail_payloads: dict[str, dict],
    authorized_paths: set[str],
) -> str:
    path_rows: dict[str, dict[str, set[str]]] = defaultdict(
        lambda: {
            "roles": set(),
            "family_ids": set(),
            "categories": set(),
            "titles": set(),
            "families_with_authorized_primary": set(),
        }
    )
    for family in sample_families:
        detail = detail_payloads[family["family_id"]]
        primary = detail["representative_detail"]["primary_image"]
        family_primary_authorized = bool(
            primary and primary in authorized_paths
        )
        media_entries = [
            (primary, "primary"),
            *[
                (path, "detail")
                for path in detail["representative_detail"]["detail_images"]
            ],
        ]
        for path, role in media_entries:
            if not path or path in authorized_paths:
                continue
            row = path_rows[path]
            row["roles"].add(role)
            row["family_ids"].add(family["family_id"])
            row["categories"].add(family["category"])
            row["titles"].add(family["title"])
            if family_primary_authorized:
                row["families_with_authorized_primary"].add(
                    family["family_id"]
                )

    columns = [
        "media_path",
        "source_url",
        "roles",
        "family_count",
        "family_ids",
        "categories",
        "product_titles",
        "family_has_authorized_primary",
        "authorization_state",
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    for path, row in sorted(
        path_rows.items(),
        key=lambda item: (
            "primary" not in item[1]["roles"],
            not item[1]["families_with_authorized_primary"],
            item[0],
        ),
    ):
        writer.writerow(
            {
                "media_path": path,
                "source_url": f"{CATALOG_IMAGE_ORIGIN}{path}",
                "roles": "|".join(sorted(row["roles"])),
                "family_count": len(row["family_ids"]),
                "family_ids": "|".join(sorted(row["family_ids"])),
                "categories": "|".join(sorted(row["categories"])),
                "product_titles": "|".join(sorted(row["titles"])),
                "family_has_authorized_primary": bool(
                    row["families_with_authorized_primary"]
                ),
                "authorization_state": "missing_public_authorization_evidence",
            }
        )
    return output.getvalue()


def build_catalog_v2_outputs(root: Path) -> tuple[dict[Path, str], dict]:
    source_report, records = audit_sources()
    excluded_records = [
        record
        for record in records
        if record["source_type"] == "mall_sql"
        and record["source_id"] in WEB_CATALOG_EXCLUDED_SOURCE_IDS
    ]
    excluded_keys = {
        record["compound_key"] for record in excluded_records
    }
    eligible_records = [
        record
        for record in records
        if record["compound_key"] not in excluded_keys
    ]
    source_report["web_catalog_boundary"] = {
        "source_records": len(records),
        "eligible_lighting_records": len(eligible_records),
        "excluded_non_lighting_records": len(excluded_records),
        "exclusions": [
            {
                "source_key": record["compound_key"],
                "title": record["title"],
                "category": record["category"],
                "disposition": "governance_only_excluded_from_web_catalog",
            }
            for record in sorted(
                excluded_records, key=lambda item: item["compound_key"]
            )
        ],
    }
    source_snapshot_sha256 = catalog_snapshot_sha256(source_report)
    source_report["catalog_snapshot_sha256"] = source_snapshot_sha256
    baseline_families, baseline_member_to_family = build_families(
        eligible_records
    )
    derived_family_model_sha256 = family_model_sha256(baseline_families)
    source_report["derived_family_model_sha256"] = (
        derived_family_model_sha256
    )
    review_rows = build_review_rows(
        baseline_families, source_snapshot_sha256
    )
    category_review_candidates = build_category_review_candidates(
        eligible_records,
        source_snapshot_sha256,
    )
    decision_summary, active_approved_decisions = validate_family_decisions(
        root,
        review_rows,
        category_review_candidates,
        source_snapshot_sha256,
        {
            record["category"]
            for record in eligible_records
            if record["category"] not in {"类别", "待复核"}
        },
    )
    (
        effective_eligible_records,
        families,
        member_to_family,
        decision_application,
    ) = apply_catalog_decisions(
        eligible_records,
        baseline_families,
        review_rows,
        category_review_candidates,
        active_approved_decisions,
        source_snapshot_sha256,
    )
    applied_review_ids = set(decision_application["applied_review_ids"])
    category_review_ids = {
        candidate["review_id"]
        for candidate in category_review_candidates
    }
    decision_summary.update(
        {
            "effective_approved_count": len(applied_review_ids),
            "approved_pending_application_ids": sorted(
                set(active_approved_decisions) - applied_review_ids
            ),
            "approved_review_ids": sorted(
                applied_review_ids - category_review_ids
            ),
            "approved_category_review_ids": sorted(
                applied_review_ids & category_review_ids
            ),
            "application_sha256": decision_application[
                "decision_application_sha256"
            ],
        }
    )
    source_report["applied_family_model_sha256"] = (
        decision_application["output_family_model_sha256"]
    )
    source_report["decision_application_sha256"] = (
        decision_application["decision_application_sha256"]
    )
    families = plan_family_routes(root, families, member_to_family)
    public_route_contract = plan_public_catalog_routes(root, families)
    route_aliases = current_route_aliases(root, families, member_to_family)
    sample_families = select_sample_families(families, route_aliases)
    authorized_paths = authorized_catalog_media_paths(root)
    raw_detail_payloads = {
        family["family_id"]: family_detail_payload(family)
        for family in sample_families
    }
    detail_payloads = {
        family_id: authorized_runtime_detail_payload(
            detail, authorized_paths
        )
        for family_id, detail in raw_detail_payloads.items()
    }
    index_payload = {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "visibility": "private_noindex_sample",
        "sample_size": len(sample_families),
        "items": [
            detail_payloads[family["family_id"]]["family"]
            for family in sample_families
        ],
    }
    (
        active_batch,
        active_batch_family_ids,
        validated_release_batches,
    ) = validate_release_batch(
        root,
        source_snapshot_sha256,
        [family["family_id"] for family in sample_families],
        {family["family_id"] for family in families},
        sum(family["member_count"] for family in families),
        {
            member["compound_key"]
            for family in families
            for member in family["members"]
        },
        decision_application["decision_application_sha256"],
        decision_application["output_family_model_sha256"],
    )
    full_release_specification, full_release_family_ids = full_release_batch(
        validated_release_batches
    )
    private_sample_batches = [
        entry
        for entry in validated_release_batches.values()
        if entry[0].get("family_selection", {}).get("artifact")
        == "product-sample-batch-120.json"
    ]
    if len(private_sample_batches) != 1:
        raise RuntimeError(
            "catalog v2 requires exactly one private sample release batch"
        )
    private_sample_batch, _ = private_sample_batches[0]
    active_batch_is_full_public_release = (
        active_batch["batch_id"]
        == full_release_specification["batch_id"]
        and active_batch["target_visibility"] == "public_indexable"
    )
    public_runtime = build_full_public_runtime(
        families,
        public_route_contract,
        full_release_specification,
        active_batch["batch_id"],
    )
    family_by_id = {family["family_id"]: family for family in families}
    active_batch_detail_payloads = {
        family_id: family_detail_payload(family_by_id[family_id])
        for family_id in active_batch_family_ids
    }
    active_batch_member_keys = {
        member["compound_key"]
        for family_id in active_batch_family_ids
        for member in family_by_id[family_id]["members"]
    }
    required_review_ids = sorted(
        row["review_id"]
        for row in review_rows
        if active_batch_member_keys
        & set(row["member_keys"].split("|"))
    )
    approved_review_ids = set(decision_summary["approved_review_ids"])
    unresolved_review_ids = sorted(
        set(required_review_ids) - approved_review_ids
    )
    required_category_review_ids = sorted(
        candidate["review_id"]
        for candidate in category_review_candidates
        if candidate["source_key"] in active_batch_member_keys
    )
    approved_category_review_ids = set(
        decision_summary["approved_category_review_ids"]
    )
    blocking_category_review_ids = sorted(
        set(required_category_review_ids) - approved_category_review_ids
    )
    media_authorization = sample_media_authorization(
        root,
        active_batch_detail_payloads,
    )
    full_release_readiness = build_full_release_readiness(
        full_release_specification,
        full_release_family_ids,
        active_batch["batch_id"],
        families,
        review_rows,
        category_review_candidates,
        decision_summary,
        decision_application,
        source_snapshot_sha256,
        authorized_paths,
        public_route_contract,
        public_runtime,
    )
    if full_release_readiness["public_release_eligible"]:
        public_runtime["publication_state"] = "active_public_indexable"
        full_release_readiness = build_full_release_readiness(
            full_release_specification,
            full_release_family_ids,
            active_batch["batch_id"],
            families,
            review_rows,
            category_review_candidates,
            decision_summary,
            decision_application,
            source_snapshot_sha256,
            authorized_paths,
            public_route_contract,
            public_runtime,
        )
    if active_batch_is_full_public_release:
        public_media = full_release_readiness["media_authorization"][
            "public_projection"
        ]
        media_authorization = {
            "scope": "public_runtime_projection",
            "family_count": len(active_batch_family_ids),
            "unique_media_paths": public_media["emitted_media_path_count"],
            "authorized_media_paths": public_media[
                "emitted_media_path_count"
            ],
            "unauthorized_media_path_count": public_media[
                "emitted_unauthorized_media_path_count"
            ],
            "unauthorized_media_paths_sha256": stable_json_sha256([]),
            "suppressed_source_media_path_count": public_media[
                "suppressed_source_media_path_count"
            ],
            "raw_source_media_path_count": full_release_readiness[
                "media_authorization"
            ]["unique_media_paths"],
            "public_media_policy": full_release_readiness[
                "media_authorization"
            ]["public_media_policy"],
        }
    active_batch_runtime_emitted = (
        full_release_readiness["public_runtime"]["emitted"]
        if active_batch_is_full_public_release
        else set(active_batch_family_ids) == set(detail_payloads)
    )
    controls = active_batch["controls"]
    if active_batch_is_full_public_release:
        public_release_eligible = full_release_readiness[
            "public_release_eligible"
        ]
        release_blockers = full_release_readiness["blockers"]
    else:
        public_release_eligible = (
            active_batch["target_visibility"] == "public_indexable"
            and active_batch["state"] in {"approved", "emitted", "deployed"}
            and bool(active_batch.get("approved_by"))
            and bool(active_batch.get("approved_at"))
            and not unresolved_review_ids
            and not blocking_category_review_ids
            and media_authorization["unauthorized_media_path_count"] == 0
            and active_batch_runtime_emitted
            and controls.get("robots_index") is True
            and controls.get("sitemap_included") is True
            and controls.get("alias_activation") == "approved"
        )
        release_blockers = [
            *(
                [f"{len(unresolved_review_ids)}_family_reviews_unresolved"]
                if unresolved_review_ids
                else []
            ),
            *(
                [
                    f"{len(blocking_category_review_ids)}_category_reviews_unresolved"
                ]
                if blocking_category_review_ids
                else []
            ),
            *(
                [
                    f"{media_authorization['unauthorized_media_path_count']}_media_paths_unauthorized"
                ]
                if media_authorization["unauthorized_media_path_count"]
                else []
            ),
            *(
                [
                    f"{len(decision_summary['approved_pending_application_ids'])}_approved_decisions_pending_application"
                ]
                if decision_summary["approved_pending_application_ids"]
                else []
            ),
            *(
                ["active_batch_runtime_not_emitted"]
                if not active_batch_runtime_emitted
                else []
            ),
            *(
                ["private_noindex_batch_not_public_release"]
                if active_batch["target_visibility"] == "private_noindex"
                else []
            ),
        ]
    release_validation = {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "source_snapshot_sha256": source_snapshot_sha256,
        "batch_id": active_batch["batch_id"],
        "purpose": active_batch["purpose"],
        "target_visibility": active_batch["target_visibility"],
        "state": active_batch["state"],
        "family_count": len(active_batch_family_ids),
        "required_review_ids": required_review_ids,
        "unresolved_review_ids": unresolved_review_ids,
        "required_category_review_ids": required_category_review_ids,
        "blocking_category_review_ids": blocking_category_review_ids,
        "decision_ledger": decision_summary,
        "media_authorization": media_authorization,
        "active_batch_runtime_emitted": active_batch_runtime_emitted,
        "robots_index": controls["robots_index"],
        "sitemap_included": controls["sitemap_included"],
        "alias_activation": controls["alias_activation"],
        "public_release_eligible": public_release_eligible,
        "blockers": release_blockers,
    }
    if (
        active_batch["target_visibility"] == "public_indexable"
        and not public_release_eligible
    ):
        raise RuntimeError(
            "active public catalog v2 release batch is blocked: "
            + ", ".join(release_blockers)
        )
    privacy_findings = forbidden_runtime_keys(
        {"index": index_payload, "details": detail_payloads}
    )
    runtime_authorized_paths = {
        path
        for detail in detail_payloads.values()
        for path in [
            detail["representative_detail"]["primary_image"],
            *detail["representative_detail"]["detail_images"],
        ]
        if path
    }
    if not runtime_authorized_paths.issubset(authorized_paths):
        raise RuntimeError(
            "catalog v2 runtime contains media outside the authorization set"
        )
    index_output = json_text(index_payload)
    sample_member_keys = [
        member["compound_key"]
        for family in sample_families
        for member in family["members"]
    ]
    categories_covered = sorted(
        {
            category
            for family in sample_families
            for category in family["source_categories"]
        }
    )
    eligible_categories = sorted(
        {record["category"] for record in effective_eligible_records}
    )
    sample_member_key_set = set(sample_member_keys)
    sample_required_review_ids = sorted(
        row["review_id"]
        for row in review_rows
        if sample_member_key_set & set(row["member_keys"].split("|"))
    )
    sample_unresolved_review_ids = sorted(
        set(sample_required_review_ids) - approved_review_ids
    )
    sample_required_category_review_ids = sorted(
        candidate["review_id"]
        for candidate in category_review_candidates
        if candidate["source_key"] in sample_member_key_set
    )
    sample_blocking_category_review_ids = sorted(
        set(sample_required_category_review_ids)
        - approved_category_review_ids
    )
    review_workbench = build_review_workbench(
        review_rows,
        category_review_candidates,
        eligible_records,
        baseline_member_to_family,
        active_batch,
        active_batch_family_ids,
        required_review_ids,
        unresolved_review_ids,
        required_category_review_ids,
        blocking_category_review_ids,
        active_approved_decisions,
        source_snapshot_sha256,
        derived_family_model_sha256,
        sha256_file(
            root
            / "content"
            / "governance"
            / "product-catalog-v2-family-decisions.json"
        ),
    )
    public_pilot_candidates = build_public_pilot_candidates(
        sample_families,
        raw_detail_payloads,
        review_rows,
        category_review_candidates,
        route_aliases,
        sample_unresolved_review_ids,
        sample_blocking_category_review_ids,
        private_sample_batch,
        source_snapshot_sha256,
        derived_family_model_sha256,
        authorized_paths,
    )
    private_pilot_preview = build_private_pilot_preview(
        public_pilot_candidates,
        source_snapshot_sha256,
        decision_application["output_family_model_sha256"],
    )
    active_alias_preview = build_active_alias_preview(
        route_aliases,
        active_batch_family_ids,
        active_batch["batch_id"],
    )
    media_review_csv = media_review_csv_text(
        sample_families,
        raw_detail_payloads,
        authorized_paths,
    )
    (
        full_source_disposition,
        full_family_staging_manifest,
        full_family_staging_shards,
    ) = build_full_governance_projection(
        records,
        excluded_records,
        families,
        member_to_family,
        sample_families,
        review_rows,
        category_review_candidates,
        active_approved_decisions,
        decision_application,
        source_snapshot_sha256,
        private_sample_batch["batch_id"],
        {"index": index_payload, "details": detail_payloads},
        authorized_paths,
    )
    full_source_disposition_sha256 = hashlib.sha256(
        json_text(full_source_disposition).encode("utf-8")
    ).hexdigest()
    (
        full_private_runtime_manifest,
        full_private_runtime_shards,
    ) = build_full_private_runtime_index(
        families,
        len(records),
        len(effective_eligible_records),
        len(excluded_records) + len(decision_application["excluded_sources"]),
        source_snapshot_sha256,
        full_source_disposition_sha256,
        decision_application["decision_application_sha256"],
        authorized_paths,
        {family["family_id"] for family in sample_families},
    )
    quality_report = {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "source_quality": source_report["quality"],
        "normalization": {
            "compound_key_format": "source_type:source_id",
            "undefined_spec_rows_normalized_to_null": source_report["quality"][
                "undefined_spec_rows"
            ],
            "volume_header_typo_notes_normalized": source_report["quality"][
                "volume_header_typo_notes"
            ],
            "source_files_modified": 0,
        },
        "families": {
            "source_products": len(records),
            "eligible_lighting_products": len(eligible_records),
            "applied_lighting_products": len(effective_eligible_records),
            "excluded_non_lighting_products": len(excluded_records),
            "decision_excluded_products": len(
                decision_application["excluded_sources"]
            ),
            "baseline_derived_families": len(baseline_families),
            "derived_families": len(families),
            "auto_merged_families": sum(
                family["member_count"] > 1 for family in families
            ),
            "route_ready_families": sum(
                family["route_plan_state"] == "existing_route_preserved"
                for family in families
            ),
            "route_pending_families": sum(
                family["planned_canonical_route"] is None
                for family in families
            ),
            "public_route_ready_families": len(
                public_route_contract["entries"]
            ),
            "neutral_catalog_route_families": public_route_contract[
                "neutral_catalog_route_count"
            ],
            "cross_category_reference_image_families": sum(
                family["category_state"] == "pending_owner_selection"
                for family in families
            ),
            "review_rows": len(review_rows),
        },
        "sample": {
            "target": SAMPLE_SIZE,
            "actual": len(sample_families),
            "categories_covered": categories_covered,
            "source_members_represented": len(sample_member_keys),
            "existing_routes_reserved": len(route_aliases),
            "existing_route_mapping_missing": sum(
                alias["planned_canonical_route"] is None
                for alias in route_aliases
            ),
        },
        "governance": {
            "source_snapshot_sha256": source_snapshot_sha256,
            "family_review_rows": len(review_rows),
            "category_review_candidates": len(category_review_candidates),
            "active_batch_id": active_batch["batch_id"],
            "active_batch_required_reviews": len(required_review_ids),
            "active_batch_unresolved_reviews": len(unresolved_review_ids),
            "active_batch_blocking_category_reviews": len(
                blocking_category_review_ids
            ),
            "active_batch_public_release_eligible": public_release_eligible,
            "review_workbench_items": review_workbench["counts"]["total"],
            "authorized_primary_pilot_candidates": public_pilot_candidates[
                "counts"
            ]["authorized_primary_candidates"],
            "fully_media_authorized_pilot_candidates": public_pilot_candidates[
                "counts"
            ]["fully_media_authorized_candidates"],
            "full_release_public_eligible": full_release_readiness[
                "public_release_eligible"
            ],
            "full_release_blocker_count": len(
                full_release_readiness["blockers"]
            ),
        },
        "runtime": {
            "index_bytes": len(index_output.encode("utf-8")),
            "index_budget_bytes": 500 * 1024,
            "detail_file_count": len(detail_payloads),
            "authorized_media_path_count": len(runtime_authorized_paths),
            "unauthorized_media_paths_emitted": 0,
            "public_catalog_runtime_family_count": len(
                public_runtime["items"]
            ),
            "public_catalog_emitted_media_count": sum(
                item["media"]["emitted_media_count"]
                for item in public_runtime["items"]
            ),
            "forbidden_iot_or_personal_keys": privacy_findings,
            "stock_and_price_exposed": False,
        },
        "acceptance": {
            "source_count_is_1920": len(records) == 1920,
            "compound_keys_unique": source_report["quality"][
                "compound_key_duplicates"
            ]
            == 0,
            "sample_count_is_120": len(sample_families) == SAMPLE_SIZE,
            "all_eligible_categories_covered": categories_covered
            == eligible_categories,
            "non_lighting_records_have_explicit_disposition": len(
                excluded_records
            )
            == len(WEB_CATALOG_EXCLUDED_SOURCE_IDS),
            "all_31_existing_routes_reserved": len(route_aliases) == 31
            and all(alias["planned_canonical_route"] for alias in route_aliases),
            "canonical_route_contract_is_topic_source_id": all(
                family["planned_canonical_route"] is None
                or family["planned_canonical_route"]
                == (
                    f"/products/{family['topic_slug']}/"
                    f"{family['canonical_source_id']}"
                )
                for family in families
            )
            and not any(
                (family["planned_canonical_route"] or "").startswith(
                    "/products/family/"
                )
                for family in families
            ),
            "index_within_500kb": len(index_output.encode("utf-8")) <= 500 * 1024,
            "iot_boundary_clean": not privacy_findings,
            "runtime_media_authorized_only": (
                runtime_authorized_paths.issubset(authorized_paths)
            ),
            "active_batch_runtime_family_set_is_exact": (
                set(active_batch_family_ids)
                == {
                    route["family_id"]
                    for route in public_route_contract["entries"]
                }
                and len(public_runtime["items"])
                == len(active_batch_family_ids)
                if active_batch_is_full_public_release
                else set(active_batch_family_ids) == set(detail_payloads)
            ),
            "decision_application_conserves_sources": (
                decision_application["included_source_count"]
                + decision_application["excluded_source_count"]
                == decision_application["input_source_count"]
            ),
            "active_release_controls_safe": (
                (
                    active_batch["target_visibility"] == "private_noindex"
                    and controls["robots_index"] is False
                    and controls["sitemap_included"] is False
                    and controls["alias_activation"] == "disabled"
                )
                or (
                    active_batch_is_full_public_release
                    and public_release_eligible
                    and controls["robots_index"] is True
                    and controls["sitemap_included"] is True
                    and controls["alias_activation"] == "approved"
                )
            ),
            "blocked_batch_not_misreported_as_public": (
                public_release_eligible
                or (not public_release_eligible and bool(release_blockers))
            ),
            "full_release_not_misreported_as_public": (
                full_release_readiness["public_release_eligible"]
                or bool(full_release_readiness["blockers"])
            ),
            "neutral_public_route_contract_covers_all_families": (
                len(public_route_contract["entries"]) == len(families)
                and not full_release_readiness["canonical_route_readiness"]
                ["route_pending_family_count"]
            ),
            "public_runtime_suppresses_all_source_media": (
                sum(
                    item["media"]["emitted_media_count"]
                    for item in public_runtime["items"]
                )
                == 0
            ),
            "active_batch_media_scope_is_exact": media_authorization[
                "family_count"
            ]
            == len(active_batch_family_ids),
            "review_workbench_matches_active_blockers": review_workbench[
                "counts"
            ]["pending"]
            == len(unresolved_review_ids)
            + len(blocking_category_review_ids),
        },
    }
    manifest = {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "visibility": "private_noindex_sample",
        "source_product_count": len(records),
        "eligible_product_count": len(eligible_records),
        "excluded_non_lighting_product_count": len(excluded_records),
        "derived_family_count": len(families),
        "sample_family_count": len(sample_families),
        "detail_file_count": len(detail_payloads),
        "index_bytes": len(index_output.encode("utf-8")),
        "route_alias_count": len(route_aliases),
        "route_ready_family_count": sum(
            family["route_plan_state"] == "existing_route_preserved"
            for family in families
        ),
        "route_pending_family_count": sum(
            family["planned_canonical_route"] is None
            for family in families
        ),
        "public_catalog_route_ready_family_count": len(
            public_route_contract["entries"]
        ),
        "public_catalog_route_pending_family_count": 0,
        "active_batch_id": active_batch["batch_id"],
        "decision_application_sha256": decision_application[
            "decision_application_sha256"
        ],
        "authorized_media_path_count": len(runtime_authorized_paths),
        "public_release_eligible": public_release_eligible,
        "categories_covered": categories_covered,
    }
    sample_batch = {
        "schema_version": 1,
        "snapshot_date": SNAPSHOT_DATE,
        "selection": "existing_routes_first_then_category_round_robin_by_quality",
        "target": SAMPLE_SIZE,
        "actual": len(sample_families),
        "family_ids": [family["family_id"] for family in sample_families],
        "source_member_keys": sample_member_keys,
        "release_batch": {
            "batch_id": private_sample_batch["batch_id"],
            "target_visibility": private_sample_batch[
                "target_visibility"
            ],
            "state": private_sample_batch["state"],
            "robots_index": private_sample_batch["controls"][
                "robots_index"
            ],
            "sitemap_included": private_sample_batch["controls"][
                "sitemap_included"
            ],
            "alias_activation": private_sample_batch["controls"][
                "alias_activation"
            ],
            "public_release_eligible": False,
        },
    }
    readable_report = "\n".join(
        [
            "# 产品目录 V2 P0 + P1 + P2 质量报告",
            "",
            f"- 来源快照：{SNAPSHOT_DATE}",
            f"- 来源商品：{len(records)}（SQL 商品与本地补充使用复合主键）",
            f"- 网页目录候选：{len(eligible_records)}，另有 {len(excluded_records)} 条非照明商品仅保留治理去向",
            f"- 自动派生产品族：{len(families)}，其中强证据合并 {quality_report['families']['auto_merged_families']} 组",
            f"- 人工复核行：{len(review_rows)}",
            f"- 私有样板：{len(sample_families)} 个产品族，覆盖 {len(categories_covered)} 个分类",
            f"- 当前批次待完成人工关系复核：{len(unresolved_review_ids)} 条；待处理分类异常：{len(blocking_category_review_ids)} 条",
            (
                f"- 当前全量公开投影输出 {media_authorization['unique_media_paths']} 条来源媒体；已抑制 {media_authorization['suppressed_source_media_path_count']} 条来源媒体，不输出未授权媒体。"
                if active_batch_is_full_public_release
                else f"- 当前批次媒体路径：{media_authorization['unique_media_paths']} 条，其中 {media_authorization['unauthorized_media_path_count']} 条没有公开授权批次证据"
            ),
            f"- 私有运行时仅输出 {len(runtime_authorized_paths)} 条已授权媒体路径；其余路径保留在治理清单，不进入图片代理白名单。",
            f"- 本地人工审核工作台：{review_workbench['counts']['total']} 项；已授权首图候选：{public_pilot_candidates['counts']['authorized_primary_candidates']} 个产品族，其中原样展示媒体全授权 {public_pilot_candidates['counts']['fully_media_authorized_candidates']} 个",
            (
                "- 当前全量公开批次已生成可索引运行时；真实部署与生产环境门禁仍独立执行。"
                if active_batch_is_full_public_release
                else "- 当前批次保持 private_noindex；不进 sitemap，不激活旧路由别名，也不视为公开发布。"
            ),
            f"- 旧产品 URL 预留映射：{len(route_aliases)} 条，当前未激活跳转",
            f"- 中性产品系列公开路径账本：{public_route_contract['family_count']} 条，其中新增中性路径 {public_route_contract['neutral_catalog_route_count']} 条；公共投影为 {'可索引激活态' if active_batch_is_full_public_release else 'noindex 草稿'}且不输出任何源图片。",
            f"- 轻量索引：{quality_report['runtime']['index_bytes']} bytes（预算 512000 bytes）",
            f"- `undefined-*` 规格行派生层归一为空值：{quality_report['normalization']['undefined_spec_rows_normalized_to_null']}",
            f"- “体戏”表头派生层归一为“体积”：{quality_report['normalization']['volume_header_typo_notes_normalized']} 篇",
            "- SQL、Obsidian 商品页和 IoT 原始资料均未修改。",
            "- IoT 产品配置、用户、地址、订单、支付、设备实例、日志、验证码与密钥字段未进入运行时样板。",
            "",
            "## 验收",
            "",
            *[
                f"- {'通过' if passed else '未通过'}：{name}"
                for name, passed in quality_report["acceptance"].items()
            ],
        ]
    ) + "\n"

    governance = root / "content" / "governance"
    governance_staging = (
        governance / "product-catalog-v2-family-staging"
    )
    runtime = root / "content" / "runtime" / "catalog-v2"
    full_private_runtime = (
        root / "content" / "runtime" / "catalog-v2-full-private"
    )
    full_public_runtime = (
        root / "content" / "runtime" / "catalog-v2-public"
    )
    outputs: dict[Path, str] = {
        governance / "product-catalog-v2-source-snapshot.json": json_text(
            source_report
        ),
        governance / "product-catalog-v2-quality-report.json": json_text(
            quality_report
        ),
        governance / "product-catalog-v2-quality-report.md": readable_report,
        governance / "product-family-review.csv": review_csv_text(review_rows),
        governance / "product-catalog-v2-route-aliases.json": json_text(
            route_aliases
        ),
        governance / "product-catalog-v2-public-route-contract.json": json_text(
            public_route_contract
        ),
        governance / "product-catalog-v2-decision-application.json": json_text(
            decision_application
        ),
        governance / "product-catalog-v2-release-validation.json": json_text(
            release_validation
        ),
        governance / "product-catalog-v2-full-release-readiness.json": json_text(
            full_release_readiness
        ),
        governance / "product-catalog-v2-review-workbench.json": json_text(
            review_workbench
        ),
        governance
        / "product-catalog-v2-public-pilot-candidates.json": json_text(
            public_pilot_candidates
        ),
        governance / "product-catalog-v2-private-pilot-preview.json": json_text(
            private_pilot_preview
        ),
        governance / "product-catalog-v2-active-alias-preview.json": json_text(
            active_alias_preview
        ),
        governance / "product-catalog-v2-media-review.csv": media_review_csv,
        governance / "product-sample-batch-120.json": json_text(sample_batch),
        governance / "product-catalog-v2-source-disposition.json": json_text(
            full_source_disposition
        ),
        governance_staging / "manifest.json": json_text(
            full_family_staging_manifest
        ),
        root / "content" / "catalog-v2.generated.ts": typescript_registry_text(
            sample_families
        ),
        runtime / "manifest.json": json_text(manifest),
        runtime / "index.json": index_output,
        runtime / "authorized-media.json": json_text(
            {
                "schema_version": 1,
                "visibility": "private_noindex",
                "source_snapshot_sha256": source_snapshot_sha256,
                "batch_id": active_batch["batch_id"],
                "policy": "displayed_paths_intersect_approved_batch_inventory",
                "path_count": len(runtime_authorized_paths),
                "paths": sorted(runtime_authorized_paths),
            }
        ),
        full_private_runtime / "manifest.json": json_text(
            full_private_runtime_manifest
        ),
        full_public_runtime / "index.json": compact_json_text(public_runtime),
    }
    for family_id, payload in detail_payloads.items():
        outputs[runtime / "details" / f"{family_id}.json"] = json_text(payload)
    for file_name, payload in full_family_staging_shards.items():
        outputs[governance_staging / file_name] = json_text(payload)
    for file_name, payload in full_private_runtime_shards.items():
        outputs[full_private_runtime / file_name] = compact_json_text(payload)
    return outputs, quality_report


def validate_committed_catalog_v2(root: Path) -> dict:
    governance = root / "content" / "governance"
    runtime = root / "content" / "runtime" / "catalog-v2"
    quality_path = governance / "product-catalog-v2-quality-report.json"
    manifest_path = runtime / "manifest.json"
    index_path = runtime / "index.json"
    staging_manifest_path = (
        governance / "product-catalog-v2-family-staging" / "manifest.json"
    )
    required = [quality_path, manifest_path, index_path, staging_manifest_path]
    missing = [str(path.relative_to(root)) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError("committed catalog v2 artifacts are missing: " + ", ".join(missing))

    report = json.loads(quality_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    index = json.loads(index_path.read_text(encoding="utf-8"))
    staging = json.loads(staging_manifest_path.read_text(encoding="utf-8"))
    failures = []
    if not report.get("acceptance") or not all(report["acceptance"].values()):
        failures.append("quality report acceptance is incomplete")
    if len(index.get("items", [])) != report["sample"]["actual"]:
        failures.append("runtime index sample count does not match quality report")
    if manifest.get("sample_family_count") != report["sample"]["actual"]:
        failures.append("runtime manifest sample count does not match quality report")
    if manifest.get("derived_family_count") != report["families"]["derived_families"]:
        failures.append("runtime manifest family count does not match quality report")
    if staging.get("family_count") != report["families"]["derived_families"]:
        failures.append("staging manifest family count does not match quality report")
    if staging.get("source_snapshot_sha256") != report["governance"]["source_snapshot_sha256"]:
        failures.append("staging source snapshot does not match quality report")
    detail_files = list((runtime / "details").glob("*.json"))
    if len(detail_files) != report["runtime"]["detail_file_count"]:
        failures.append("runtime detail count does not match quality report")
    if index_path.stat().st_size != report["runtime"]["index_bytes"]:
        failures.append("runtime index bytes do not match quality report")
    for shard in staging.get("shards", []):
        shard_path = staging_manifest_path.parent / shard["file"]
        if not shard_path.is_file() or sha256_file(shard_path) != shard["sha256"]:
            failures.append(f"staging shard integrity failed: {shard['file']}")
    if failures:
        raise RuntimeError("committed catalog v2 validation failed: " + "; ".join(failures))
    report["source_mode"] = "committed_snapshot"
    return report


def build_catalog_v2(root: Path, check: bool = False) -> dict:
    if check and not external_catalog_sources_available():
        return validate_committed_catalog_v2(root)
    outputs, report = build_catalog_v2_outputs(root)
    details_dir = root / "content" / "runtime" / "catalog-v2" / "details"
    governance_staging_dir = (
        root
        / "content"
        / "governance"
        / "product-catalog-v2-family-staging"
    )
    full_private_runtime_dir = (
        root / "content" / "runtime" / "catalog-v2-full-private"
    )
    expected_detail_files = {
        path for path in outputs if path.parent == details_dir
    }
    expected_governance_staging_files = {
        path for path in outputs if path.parent == governance_staging_dir
    }
    expected_full_private_runtime_files = {
        path for path in outputs if path.parent == full_private_runtime_dir
    }
    stale_detail_files = (
        set(details_dir.glob("*.json")) - expected_detail_files
        if details_dir.exists()
        else set()
    )
    stale_governance_staging_files = (
        set(governance_staging_dir.glob("*.json"))
        - expected_governance_staging_files
        if governance_staging_dir.exists()
        else set()
    )
    stale_full_private_runtime_files = (
        set(full_private_runtime_dir.glob("*.json"))
        - expected_full_private_runtime_files
        if full_private_runtime_dir.exists()
        else set()
    )
    if check:
        mismatches = [
            str(path.relative_to(root))
            for path, expected in outputs.items()
            if not path.exists() or path.read_text(encoding="utf-8") != expected
        ]
        mismatches.extend(
            str(path.relative_to(root)) for path in sorted(stale_detail_files)
        )
        mismatches.extend(
            str(path.relative_to(root))
            for path in sorted(stale_governance_staging_files)
        )
        mismatches.extend(
            str(path.relative_to(root))
            for path in sorted(stale_full_private_runtime_files)
        )
        if mismatches:
            raise RuntimeError(
                "catalog v2 generated outputs are stale: "
                + ", ".join(mismatches[:12])
            )
        return report

    for path in stale_detail_files:
        path.unlink()
    for path in stale_governance_staging_files:
        path.unlink()
    for path in stale_full_private_runtime_files:
        path.unlink()
    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return report
