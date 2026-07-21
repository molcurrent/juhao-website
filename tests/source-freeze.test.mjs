import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const freeze = JSON.parse(readFileSync(new URL("../content/governance/source-freeze.json", import.meta.url), "utf8"));

test("locks external content and media bytes to one reviewed batch", () => {
  assert.equal(freeze.batch_id, "content-freeze-2026-07-14-juhao-only");
  assert.equal(freeze.content_policy.scope, "juhao_only");
  assert.equal(freeze.content_policy.professional_article_import, "disabled");
  assert.equal(freeze.content_policy.removed_professional_article_routes, 33);
  assert.deepEqual(freeze.knowledge_sources ?? [], []);
  assert.equal(freeze.help_sources.length, 137);
  assert.equal(freeze.product_sources.length, 112);
  assert.equal(freeze.topic_sources.length, 10);
  assert.equal(freeze.company_news_sources.length, 8);
  assert.equal(freeze.media_objects.length, 332);
  assert.match(freeze.mall_sql.sha256, /^[a-f0-9]{64}$/);
});

test("rejects drift from the committed source freeze", () => {
  const output = execFileSync("python3", ["scripts/source_freeze.py", "--check"], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe",
    encoding: "utf8",
  });
  assert.equal(JSON.parse(output).external_check.status, "not_requested");
});

test("explicit external audit fails when the repository-external sources are unavailable", () => {
  const result = spawnSync("python3", ["scripts/source_freeze.py", "--check-external"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      JUHAO_KNOWLEDGE_BASE: "/nonexistent/juhao-knowledge-base",
      JUHAO_MALL_SQL: "/nonexistent/juhao-mall.sql",
    },
    stdio: "pipe",
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stderr).error, /外部来源不可用|外部知识库不可用/);
});

test("explicit external audit rejects a changed source without rewriting the freeze", () => {
  const script = String.raw`
import hashlib
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path.cwd() / "scripts"))
import source_freeze

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    knowledge_base = root / "knowledge"
    knowledge_base.mkdir()
    source = knowledge_base / "topic.md"
    source.write_text("changed", encoding="utf-8")
    freeze = root / "source-freeze.json"
    freeze.write_text(json.dumps({
        "mall_sql": {"sha256": "0" * 64},
        "help_sources": [],
        "product_sources": [],
        "topic_sources": [{"path": "topic.md", "sha256": hashlib.sha256(b"reviewed").hexdigest()}],
    }), encoding="utf-8")
    source_freeze.KB = knowledge_base
    source_freeze.SQL_SOURCE = root / "missing.sql"
    source_freeze.FREEZE_PATH = freeze
    try:
        source_freeze.verify_external_sources({"topics"})
    except ValueError as error:
        if "来源文件已变化" not in str(error):
            raise
    else:
        raise AssertionError("external drift was not rejected")
`;
  execFileSync("python3", ["-c", script], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe",
  });
});
