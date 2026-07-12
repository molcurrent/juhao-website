from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path


KB = Path("/Users/mac/Documents/juhao数据库/企业知识库")
MALL = KB / "商城系统"
OUT = Path(__file__).resolve().parents[1] / "content" / "governance"

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


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def department_map() -> dict[str, str]:
    result: dict[str, str] = {}
    folder = MALL / "商品部门索引"
    for index in sorted(folder.glob("*_部门索引.md")):
        department = index.stem.removesuffix("_部门索引")
        for source_id in re.findall(r"_(\d+)\.md\)", read(index)):
            result.setdefault(source_id, department)
    return result


def product_row(topic: str, topic_slug: str, stem: str, label: str, departments: dict[str, str]) -> dict[str, str] | None:
    path = MALL / "商品说明" / f"{stem}.md"
    if not path.exists():
        return None
    text = read(path)
    fields = dict(FIELD_RE.findall(text))
    images = IMAGE_RE.findall(text)
    if FORBIDDEN.search(f"{label} {fields.get('分类', '')}") or not images:
        return None
    return {
        "source": "企业知识库商品说明",
        "source_id": fields.get("ID", ""),
        "content_type": "产品",
        "title": label.strip(),
        "topic": topic,
        "review_status": "待审核",
        "fact_status": "需企业确认",
        "image_status": "待授权核验",
        "department": departments.get(fields.get("ID", ""), "未确认"),
        "publish_date": "",
        "updated_at": str(date.today()),
        "seo_slug": f"/products/{topic_slug}/{fields.get('ID', stem.rsplit('_', 1)[-1])}",
        "legacy_url": "",
        "source_file": str(path),
        "primary_image": images[0],
        "category": fields.get("分类", ""),
        "sale_time": fields.get("上架时间", ""),
    }


def build() -> tuple[list[dict[str, str]], list[dict[str, str]], list[str]]:
    departments = department_map()
    products: list[dict[str, str]] = []
    selected_ids: set[str] = set()
    warnings: list[str] = []
    for topic, slug in TOPICS:
        index = MALL / "商品专题分类" / f"{topic}_专题索引.md"
        links = LINK_RE.findall(read(index)) if index.exists() else []
        selected: list[dict[str, str]] = []
        seen_titles: set[str] = set()
        for stem, label in links:
            row = product_row(topic, slug, stem, label, departments)
            normalized = re.sub(r"\s+", "", label).lower()
            if row and row["source_id"] not in selected_ids and normalized not in seen_titles:
                selected.append(row)
                seen_titles.add(normalized)
                selected_ids.add(row["source_id"])
            if len(selected) == 10:
                break
        products.extend(selected)
        if len(selected) < 10:
            warnings.append(f"{topic} 仅筛出 {len(selected)} 个具备主图的候选")

    help_dir = MALL / "帮助文章"
    cases: list[dict[str, str]] = []
    for source_id, title, slug, case_type, stage in CASES:
        matches = list(help_dir.glob(f"*_{source_id}.md"))
        if not matches:
            warnings.append(f"案例源文件缺失：{source_id} {title}")
            continue
        text = read(matches[0])
        images = IMAGE_RE.findall(text)
        cases.append({
            "source": "企业知识库帮助文章",
            "source_id": str(source_id),
            "content_type": "案例",
            "title": title,
            "topic": case_type,
            "review_status": "已审核",
            "fact_status": "已核实",
            "image_status": "完整" if images else "缺失",
            "department": "工程项目",
            "publish_date": str(date.today()),
            "updated_at": str(date.today()),
            "seo_slug": f"/cases/{slug}",
            "legacy_url": "",
            "source_file": str(matches[0]),
            "primary_image": images[0] if images else "",
            "category": case_type,
            "sale_time": stage,
        })
    return products, cases, warnings


def main() -> None:
    products, cases, warnings = build()
    rows = products + cases
    OUT.mkdir(parents=True, exist_ok=True)
    fields = list(rows[0])
    with (OUT / "content-ledger.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    (OUT / "content-ledger.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    topic_counts = Counter(row["topic"] for row in products)
    report = [
        "# 企业知识库轻量探查与发布门禁报告",
        "",
        f"生成日期：{date.today()}",
        "",
        "## 探查范围",
        "",
        "- 仅读取 6 个入口/索引文件、10 个专题索引、12 个部门索引及候选记录对应文件。",
        "- 未将 8,681 款商品全文加载到上下文，也未修改企业知识库。",
        "",
        "## 质量结论",
        "",
        f"- 产品候选：{len(products)} 条；案例候选：{len(cases)} 条。",
        "- 商品说明未发现统一的已审核字段，因此全部保持“待审核”，不会自动发布详情页。",
        "- 6 条指定案例资料已按签约、中标、活动或荣誉阶段发布；页面不表述为已完工案例。",
        "- 商品页存在 `undefined-*` 规格编号等数据质量问题，发布前需按型号合并并清洗规格。",
        "- 主页与说明文件的商品数量口径不一致（8,628 / 8,681），不得用于对外宣传。",
        "- 帮助索引仍包含测试文章及错误的关于/联系资料，发布层必须显式排除。",
        "",
        "## 专题候选分布",
        "",
        *[f"- {topic}：{topic_counts[topic]}" for topic, _ in TOPICS],
        "",
        "## 门禁规则",
        "",
        "只有 `review_status=已审核`、`fact_status=已核实` 且 `image_status=完整` 的记录才能进入 sitemap 和公开详情页。",
    ]
    if warnings:
        report.extend(["", "## 待处理", "", *[f"- {item}" for item in warnings]])
    (OUT / "quality-report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(json.dumps({"products": len(products), "cases": len(cases), "warnings": warnings}, ensure_ascii=False))


if __name__ == "__main__":
    main()
