import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";


const inventoryPath = new URL("../content/governance/media-inventory.json", import.meta.url);
const provenancePath = new URL("../RECON/JUHAO_ASSET_PROVENANCE.md", import.meta.url);

async function inventory() {
  return JSON.parse(await readFile(inventoryPath, "utf8"));
}

async function publicFiles(directory = new URL("../public/", import.meta.url), prefix = "public") {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...await publicFiles(new URL(`${entry.name}/`, directory), relative));
    if (entry.isFile()) paths.push(relative);
  }
  return paths.sort();
}

test("media inventory never grants remote assets approval, publication, or indexability", async () => {
  const rows = await inventory();
  const remote = rows.filter((row) => /^https?:\/\//.test(row.asset_url));

  assert.ok(rows.length >= 300, "media inventory coverage fell below the source-packet baseline");
  assert.ok(remote.length >= 300, "remote product, case, and news sources are missing");
  for (const row of remote) {
    assert.equal(row.local_path, "", row.asset_url);
    assert.equal(row.sha256, "", row.asset_url);
    assert.equal(row.rights_status, "needs_review", row.asset_url);
    assert.equal(row.publish_allowed, false, row.asset_url);
    assert.equal(row.indexable, false, row.asset_url);
  }
});

test("publication and indexability gates cannot exceed approved provenance", async () => {
  const rows = await inventory();
  for (const row of rows) {
    if (row.publish_allowed || row.indexable) {
      assert.equal(row.rights_status, "approved", row.asset_url);
      assert.ok(row.local_path.startsWith("public/"), row.asset_url);
      assert.match(row.rights_basis, /JUHAO_ASSET_PROVENANCE\.md/, row.asset_url);
      assert.match(row.sha256, /^[a-f0-9]{64}$/, row.asset_url);
    }
    if (row.indexable) assert.equal(row.publish_allowed, true, row.asset_url);
  }
  assert.equal(rows.filter((row) => row.indexable).length, 0, "media indexing needs a separate explicit decision");
});

test("critical local JUHAO visuals exist and match the approved provenance hashes", async () => {
  const rows = await inventory();
  const provenance = await readFile(provenancePath, "utf8");
  const approved = new Map(
    [...provenance.matchAll(/\|\s*`(public\/[^`]+)`\s*\|[^|]*\|\s*`([a-f0-9]{64})`\s*\|/g)]
      .map((match) => [match[1], match[2]]),
  );

  assert.equal(approved.size, 5);
  for (const [localPath, expectedHash] of approved) {
    const bytes = await readFile(new URL(`../${localPath}`, import.meta.url));
    const actualHash = createHash("sha256").update(bytes).digest("hex");
    assert.equal(actualHash, expectedHash, localPath);

    const matches = rows.filter((row) => row.local_path === localPath);
    assert.ok(matches.length >= 1, localPath);
    for (const row of matches) {
      assert.equal(row.sha256, expectedHash, localPath);
      assert.equal(row.rights_status, "approved", localPath);
      assert.equal(row.publish_allowed, true, localPath);
      assert.ok(Number.isInteger(row.width) && row.width > 0, localPath);
      assert.ok(Number.isInteger(row.height) && row.height > 0, localPath);
      assert.ok(row.alt, localPath);
    }
  }
});

test("records approved local representative media for all 20 real article routes", async () => {
  const rows = await inventory();
  const articleMedia = rows.filter((row) => row.role === "article_representative");
  assert.equal(articleMedia.length, 20);
  assert.equal(new Set(articleMedia.map((row) => row.content_route)).size, 20);
  for (const row of articleMedia) {
    assert.match(row.content_route, /^\/news\//);
    assert.equal(row.rights_status, "approved", row.content_route);
    assert.equal(row.publish_allowed, true, row.content_route);
    assert.equal(row.indexable, false, row.content_route);
    assert.match(row.rights_basis, /JUHAO_ASSET_PROVENANCE\.md/, row.content_route);
  }
});

test("every local public asset is hashed and every inventory record has governance fields", async () => {
  const rows = await inventory();
  const required = [
    "asset_url", "local_path", "content_route", "role", "source_type", "source_id", "source_path",
    "width", "height", "alt", "rights_status", "rights_basis", "sha256", "last_verified_at",
    "publish_allowed", "indexable",
  ];
  const local = rows.filter((row) => row.local_path);
  const inventoriedLocalPaths = new Set(local.map((row) => row.local_path));

  for (const localPath of await publicFiles()) assert.ok(inventoriedLocalPaths.has(localPath), localPath);
  for (const row of rows) {
    for (const field of required) assert.ok(field in row, `${row.asset_url}: ${field}`);
    assert.ok(row.content_route, row.asset_url);
    assert.ok(row.alt, row.asset_url);
    assert.match(row.last_verified_at, /^\d{4}-\d{2}-\d{2}$/, row.asset_url);
  }
  for (const row of local) {
    const bytes = await readFile(new URL(`../${row.local_path}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), row.sha256, row.local_path);
  }
});
