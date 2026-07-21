import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCAN_ROOTS = [resolve(ROOT, "dist/client"), resolve(ROOT, "dist/server")];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".xml"]);
const TEXT_FILENAMES = new Set(["_headers", ".assetsignore"]);

const NON_LIGHTING_PRODUCT_IDS = ["4014", "4019", "4020", "4021", "5181", "11702", "11703"];

export const DIST_LEAK_RULES = Object.freeze([
  { id: "enterprise_oss_domain", pattern: /\b[a-z0-9.-]+\.oss-[a-z0-9-]+\.aliyuncs\.com\b/gi },
  { id: "local_absolute_path", pattern: /\/Users\/mac(?:\/|\b)/g },
  { id: "forbidden_source_table", pattern: /\bjh_sys_configs\b/gi },
  { id: "undefined_parameter", pattern: /\bundefined-[a-z0-9_-]+\b/gi },
  { id: "non_lighting_product_id", pattern: new RegExp(`\\b(?:${NON_LIGHTING_PRODUCT_IDS.join("|")})\\b`, "g") },
  { id: "legacy_service_phone", pattern: /\b400-0760-888\b/g },
  { id: "legacy_export_email", pattern: /\b(?:export@juhaolamp\.com|service@juhao\.com)\b/gi },
  { id: "legacy_customer_qq", pattern: /\b153289970\b/g },
  { id: "legacy_template_marker", pattern: /\bWSTMart\b|商淘|客服QQ|用户QQ群/g },
  {
    id: "private_catalog_governance_projection",
    pattern: /product_catalog_v2_full_source_disposition|product_catalog_v2_full_family_staging|product-catalog-v2-family-staging|families-\d{4}\.json/gi,
  },
  {
    id: "price_or_inventory_field",
    pattern: /(?:(?:\\?")[a-z_]*(?:price|stock|inventory)[a-z_]*(?:\\?")|\b(?:price|stock|inventory|salePrice|marketPrice)\b)\s*:/gi,
  },
  { id: "price_or_inventory_cn_field", pattern: /(?:\\?")(?:价格|库存)(?:\\?")\s*:|(?:价格|库存)[：:]/g },
]);

function isTextArtifact(pathname) {
  if (pathname.endsWith(".map")) return false;
  const name = pathname.slice(pathname.lastIndexOf("/") + 1);
  return TEXT_FILENAMES.has(name) || TEXT_EXTENSIONS.has(extname(pathname));
}

async function textArtifacts(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const pathname = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await textArtifacts(pathname));
    else if (entry.isFile() && isTextArtifact(pathname)) files.push(pathname);
  }
  return files;
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) if (source.charCodeAt(cursor) === 10) line += 1;
  return line;
}

export function findLeaksInText(source, file = "fixture") {
  const findings = [];
  for (const rule of DIST_LEAK_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      findings.push({
        rule: rule.id,
        file,
        line: lineNumberAt(source, match.index ?? 0),
        match: match[0],
      });
    }
  }
  return findings;
}

export async function auditDistLeaks() {
  const files = (await Promise.all(SCAN_ROOTS.map(textArtifacts))).flat().sort();
  const findings = [];
  let scannedBytes = 0;
  for (const pathname of files) {
    const source = await readFile(pathname, "utf8");
    scannedBytes += Buffer.byteLength(source);
    findings.push(...findLeaksInText(source, relative(ROOT, pathname)));
  }

  return {
    scope: ["dist/client", "dist/server"],
    exclusions: ["source maps", "binary media", "governance source outside dist"],
    scanned_files: files.length,
    scanned_bytes: scannedBytes,
    finding_count: findings.length,
    findings,
    passed: findings.length === 0,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await auditDistLeaks();
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
