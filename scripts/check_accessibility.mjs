import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const defaultBaseUrl = "http://127.0.0.1:4173";
const baseUrl = (process.env.A11Y_BASE_URL || defaultBaseUrl).replace(/\/$/, "");
const publicCatalogRuntime = JSON.parse(
  await readFile(
    new URL("../content/runtime/catalog-v2-public/index.json", import.meta.url),
    "utf8",
  ),
);
const crossCategoryCatalogRoute = publicCatalogRuntime.items.find(
  (item) =>
    item.route_kind === "neutral_catalog_series" &&
    item.category_state === "pending_owner_selection",
)?.canonical_path;

const routes = [
  "/",
  "/about",
  "/products",
  "/products/spotlights",
  "/products/spotlights/12265",
  "/solutions",
  "/solutions/commercial",
  "/cases",
  "/cases/jw-marriott-shenzhen-huafa-snow-world",
  "/news",
  "/news/guangzhou-international-lighting-exhibition-2026",
  "/knowledge",
  "/knowledge/232",
  "/service",
  "/partners",
  "/search",
  "/contact",
  "/catalog-lab",
  "/catalog-lab/family-f294d2abb5d4",
  "/catalog-lab/review",
  ...(crossCategoryCatalogRoute ? [crossCategoryCatalogRoute] : []),
];

async function serverReady() {
  try {
    const response = await fetch(baseUrl, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(child) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await serverReady()) return;
    if (child.exitCode !== null) {
      throw new Error(`本地预览提前退出，状态码 ${child.exitCode}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`45 秒内未能连接 ${baseUrl}`);
}

async function ensureServer() {
  if (await serverReady()) return null;
  if (process.env.A11Y_BASE_URL) {
    throw new Error(`无法连接 A11Y_BASE_URL：${baseUrl}`);
  }
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"],
    { stdio: "inherit" },
  );
  await waitForServer(child);
  return child;
}

async function launchBrowser() {
  const options = process.env.A11Y_BROWSER_EXECUTABLE
    ? { executablePath: process.env.A11Y_BROWSER_EXECUTABLE }
    : { channel: "chrome" };
  try {
    return await chromium.launch({ ...options, headless: true });
  } catch (error) {
    if (process.env.A11Y_BROWSER_EXECUTABLE) throw error;
    return chromium.launch({ headless: true });
  }
}

function formatViolation(route, violation) {
  const targets = violation.nodes
    .map((node) => `    - ${node.target.join(" ")}`)
    .join("\n");
  return `${route} · ${violation.impact} · ${violation.id}\n${targets}`;
}

let server;
let browser;

try {
  server = await ensureServer();
  browser = await launchBrowser();
  const context = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const failures = [];

  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
    });
    if (!response || response.status() >= 400) {
      failures.push(`${route} · HTTP ${response?.status() ?? "无响应"}`);
      continue;
    }
    await page.waitForTimeout(350);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    );
    failures.push(...blocking.map((violation) => formatViolation(route, violation)));
  }

  await context.close();
  if (failures.length > 0) {
    console.error(`Axe 回归失败：\n${failures.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(`Axe 回归通过：${routes.length} 个模板路由的严重和关键问题为 0。`);
  }
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}
