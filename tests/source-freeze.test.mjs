import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const freeze = JSON.parse(readFileSync(new URL("../content/governance/source-freeze.json", import.meta.url), "utf8"));

test("locks external content and media bytes to one reviewed batch", () => {
  assert.equal(freeze.batch_id, "content-freeze-2026-07-14");
  assert.equal(freeze.knowledge_sources.length, 33);
  assert.equal(freeze.help_sources.length, 137);
  assert.equal(freeze.product_sources.length, 112);
  assert.equal(freeze.topic_sources.length, 10);
  assert.equal(freeze.company_news_sources.length, 8);
  assert.equal(freeze.media_objects.length, 332);
  assert.match(freeze.mall_sql.sha256, /^[a-f0-9]{64}$/);
});

test("rejects drift from the committed source freeze", () => {
  execFileSync("python3", ["scripts/source_freeze.py", "--check"], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe",
  });
});
