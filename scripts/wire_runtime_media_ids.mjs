import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const INVENTORY_PATH = resolve(ROOT, "content/governance/media-inventory.json");
const REPORT_PATH = resolve(ROOT, "content/runtime/media-rewrite-report.json");
const TARGETS = ["content/catalog.ts", "content/topic-guides.ts"];
const ENTERPRISE_URL = /https?:\/\/bocang\.oss-cn-shenzhen\.aliyuncs\.com\/[^"'\s)]+/g;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalize = (value) => value.replace(/^http:\/\//, "https://");

const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
const mediaIdByUrl = new Map();
for (const row of inventory) {
  if (/^https?:\/\//.test(row.asset_url) && row.publish_allowed && row.media_id) {
    mediaIdByUrl.set(row.asset_url, row.media_id);
    mediaIdByUrl.set(normalize(row.asset_url), row.media_id);
  }
}

const report = [];
for (const relative of TARGETS) {
  const path = resolve(ROOT, relative);
  const before = await readFile(path, "utf8");
  let replacements = 0;
  const after = before.replace(ENTERPRISE_URL, (url) => {
    const mediaId = mediaIdByUrl.get(url) ?? mediaIdByUrl.get(normalize(url));
    if (!mediaId) throw new Error(`${relative} 包含未进入 178 项显示集的素材：${url}`);
    replacements += 1;
    return mediaId;
  });
  await writeFile(path, after, "utf8");
  report.push({
    file: relative,
    replacements,
    wired_media_ids: (after.match(/media-[a-f0-9]{20}/g) ?? []).length,
    before_sha256: sha256(before),
    after_sha256: sha256(after),
    remaining_enterprise_urls: (after.match(ENTERPRISE_URL) ?? []).length,
  });
}

await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
