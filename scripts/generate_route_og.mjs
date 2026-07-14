import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const LEDGER_PATH = resolve(ROOT, "content/governance/content-ledger.json");
const OUTPUT_DIR = resolve(ROOT, "public/og");
const MANIFEST_PATH = resolve(ROOT, "content/governance/route-og.json");
const LOGO_PATH = resolve(ROOT, "public/brand/juhao-logo-horizontal-white.svg");
const MAX_BYTES = 300_000;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function splitTitle(value) {
  const text = String(value).replace(/\s+/g, " ").trim();
  const units = [...text];
  if (units.length <= 15) return [text];
  const preferred = Math.min(18, Math.ceil(units.length / 2));
  let split = preferred;
  for (let offset = 0; offset <= 5; offset += 1) {
    for (const candidate of [preferred + offset, preferred - offset]) {
      if (candidate <= 8 || candidate >= units.length) continue;
      if (/[ ·｜|—-]/.test(units[candidate] ?? "")) {
        split = candidate + 1;
        offset = 99;
        break;
      }
    }
  }
  const lines = [units.slice(0, split).join("").trim(), units.slice(split).join("").trim()].filter(Boolean);
  return lines.map((line) => [...line].slice(0, 23).join(""));
}

function routeFilename(route) {
  if (route === "/") return "home.jpg";
  const readable = route.slice(1).replaceAll("/", "--").replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 90);
  return `${readable || "route"}-${sha256(route).slice(0, 8)}.jpg`;
}

function cardSvg(record) {
  const titleLines = splitTitle(record.title);
  const titleSize = titleLines.some((line) => [...line].length > 19) ? 54 : 62;
  const label = record.content_type === "案例"
    ? "PROJECT SOURCE · 签约 / 中标资料"
    : `${String(record.content_type || "页面").toUpperCase()} · PRIVATE PREVIEW`;
  const titleMarkup = titleLines.map((line, index) => (
    `<tspan x="74" dy="${index === 0 ? 0 : titleSize * 1.18}">${xml(line)}</tspan>`
  )).join("");

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#1e1916"/>
      <rect x="0" y="0" width="22" height="630" fill="#e05717"/>
      <rect x="780" y="0" width="420" height="630" fill="#27211e"/>
      <circle cx="1010" cy="132" r="238" fill="none" stroke="#e05717" stroke-opacity=".32" stroke-width="2"/>
      <circle cx="1010" cy="132" r="170" fill="none" stroke="#abaaa8" stroke-opacity=".15" stroke-width="1"/>
      <path d="M780 490H1200M780 540H1200M850 0V630M930 0V630M1010 0V630M1090 0V630M1170 0V630" stroke="#abaaa8" stroke-opacity=".09"/>
      <text x="74" y="214" fill="#e05717" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="17" font-weight="700" letter-spacing="2.8">${xml(label)}</text>
      <text x="74" y="294" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, Arial, sans-serif" font-size="${titleSize}" font-weight="700" letter-spacing="-1.2">${titleMarkup}</text>
      <text x="74" y="548" fill="#abaaa8" font-family="Arial, PingFang SC, sans-serif" font-size="18">${xml(record.route)}</text>
      <text x="1126" y="570" fill="#e05717" text-anchor="end" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="2">JUHAO.COM</text>
    </svg>
  `);
}

async function renderCard(record, logo) {
  const filename = routeFilename(record.route);
  const outputPath = resolve(OUTPUT_DIR, filename);
  const base = sharp(cardSvg(record)).composite([{ input: logo, left: 74, top: 64 }]);
  let bytes = await base.jpeg({ quality: 84, progressive: true, mozjpeg: true }).toBuffer();
  if (bytes.length > MAX_BYTES) {
    bytes = await sharp(bytes).jpeg({ quality: 76, progressive: true, mozjpeg: true }).toBuffer();
  }
  if (bytes.length > MAX_BYTES) throw new Error(`${record.route} OG 超过 ${MAX_BYTES} bytes`);
  await writeFile(outputPath, bytes);
  return {
    route: record.route,
    path: `/og/${filename}`,
    width: 1200,
    height: 630,
    bytes: bytes.length,
    sha256: sha256(bytes),
    alt: `${record.title}｜钜豪照明`,
    stage_label: record.content_type === "案例" ? "签约 / 中标资料" : "",
  };
}

async function main() {
  const ledger = JSON.parse(await readFile(LEDGER_PATH, "utf8"));
  const published = ledger.filter((record) => record.publish_status === "published");
  const routes = new Set();
  for (const record of published) {
    if (!record.route?.startsWith("/")) throw new Error(`无效发布路由：${record.route}`);
    if (routes.has(record.route)) throw new Error(`重复发布路由：${record.route}`);
    routes.add(record.route);
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  const logo = await sharp(LOGO_PATH).resize({ width: 272 }).png().toBuffer();
  const manifest = [];
  for (const record of [...published].sort((left, right) => left.route.localeCompare(right.route))) {
    manifest.push(await renderCard(record, logo));
  }
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const largest = Math.max(...manifest.map((record) => record.bytes));
  console.log(JSON.stringify({ routes: manifest.length, largest_bytes: largest, output_bytes: (await Promise.all(manifest.map((record) => stat(resolve(ROOT, "public", record.path.slice(1)))))).reduce((total, item) => total + item.size, 0) }, null, 2));
}

await main();
