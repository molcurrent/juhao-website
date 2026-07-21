import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const baseUrl = (process.env.VISUAL_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const reportPath = new URL("../reports/visual-route-acceptance.json", import.meta.url);
const expectedRouteCount = 343;
const viewports = [
  { label: "320", width: 320, height: 800 },
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1024", width: 1024, height: 900 },
  { label: "1440", width: 1440, height: 1000 },
];

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

async function routeInventory() {
  const [publicationLedger, knowledgeLibrary, catalogIndex, publicCatalog] = await Promise.all([
    json("content/runtime/publication-ledger.json"),
    json("content/runtime/knowledge-library.json"),
    json("content/runtime/catalog-v2/index.json"),
    json("content/runtime/catalog-v2-public/index.json"),
  ]);
  const routes = new Set([
    "/",
    "/knowledge",
    "/catalog-lab",
    "/catalog-lab/review",
    "/contact/success",
  ]);
  publicationLedger
    .filter((record) => record.publish_status === "published")
    .forEach((record) => routes.add(record.route));
  knowledgeLibrary.articles.forEach((article) => routes.add(article.path));
  catalogIndex.items.forEach((item) =>
    routes.add(`/catalog-lab/${item.family_id}`),
  );
  const neutralSeries = publicCatalog.items.filter(
    (item) => item.route_kind === "neutral_catalog_series",
  );
  for (const item of [
    neutralSeries.find((item) => item.category_state === "source_category_unambiguous"),
    neutralSeries.find((item) => item.category_state === "pending_owner_selection"),
  ]) {
    if (item) routes.add(item.canonical_path);
  }
  const output = [...routes].sort((a, b) => a.localeCompare(b, "zh-CN"));
  if (output.length !== expectedRouteCount) {
    throw new Error(`路由清单应为 ${expectedRouteCount} 条，当前为 ${output.length} 条。`);
  }
  return output;
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function checkViewport(browser, viewport, routes) {
  const context = await browser.newContext({
    colorScheme: "light",
    reducedMotion: "reduce",
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const failureSet = new Set();
  const results = [];
  let activeRoute = "";
  const fail = (message) => failureSet.add(message);

  page.on("console", (message) => {
    if (message.type() === "error") {
      fail(`${viewport.label} ${activeRoute}: console ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    fail(`${viewport.label} ${activeRoute}: pageerror ${error.message}`);
  });
  page.on("response", (response) => {
    if (
      activeRoute &&
      response.request().resourceType() === "image" &&
      response.status() >= 400
    ) {
      fail(
        `${viewport.label} ${activeRoute}: 图片请求 HTTP ${response.status()} ${response.url()}`,
      );
    }
  });

  for (const [index, route] of routes.entries()) {
    activeRoute = route;
    try {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
      const status = response?.status() ?? 0;
      if (status >= 400 || status === 0) {
        fail(`${viewport.label} ${route}: HTTP ${status || "无响应"}`);
        results.push({ route, status });
        continue;
      }
      await page.waitForTimeout(180);
      await page.evaluate(async () => {
        const step = Math.max(320, Math.floor(window.innerHeight * 0.8));
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll("main img")].every(
              (image) => image.complete,
            ),
          undefined,
          { timeout: 2_500 },
        )
        .catch(() => {});
      const metrics = await page.evaluate(() => {
        const brokenImages = [...document.querySelectorAll("main img")]
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.getAttribute("src") || "");
        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          maxScrollX: (() => {
            const initialX = window.scrollX;
            window.scrollTo(document.documentElement.scrollWidth, window.scrollY);
            const value = window.scrollX;
            window.scrollTo(initialX, window.scrollY);
            return value;
          })(),
          h1Count: document.querySelectorAll("main h1").length,
          brokenImages,
        };
      });
      if (metrics.maxScrollX > 1) {
        fail(
          `${viewport.label} ${route}: 可横向滚动 ${metrics.maxScrollX}px（scrollWidth ${metrics.scrollWidth}）`,
        );
      }
      if (metrics.h1Count !== 1) {
        fail(`${viewport.label} ${route}: H1 数量为 ${metrics.h1Count}`);
      }
      if (metrics.brokenImages.length > 0) {
        fail(
          `${viewport.label} ${route}: 破图 ${metrics.brokenImages.join(", ")}`,
        );
      }
      results.push({
        route,
        status,
        scrollWidth: metrics.scrollWidth,
        clientWidth: metrics.clientWidth,
        maxScrollX: metrics.maxScrollX,
        brokenImageCount: metrics.brokenImages.length,
      });
    } catch (error) {
      fail(
        `${viewport.label} ${route}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if ((index + 1) % 50 === 0 || index + 1 === routes.length) {
      console.log(`${viewport.label}: ${index + 1}/${routes.length}`);
    }
  }

  await context.close();
  return { viewport, failures: [...failureSet], results };
}

async function checkWorkbenchInteractions(browser) {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const failures = [];
  await page.goto(`${baseUrl}/catalog-lab`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(350);
  const toggle = page.getByRole("button", { name: /筛选与搜索/ });
  await toggle.click();
  await page.waitForTimeout(100);
  const targetSizes = await page
    .locator("#catalog-mobile-filters button, #catalog-mobile-filters input, #catalog-mobile-filters select")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
  if (targetSizes.some(({ width, height }) => width < 44 || height < 44)) {
    failures.push("390 catalog-lab: 移动筛选抽屉存在小于 44px 的操作目标");
  }
  await page.keyboard.press("Escape");
  if (await page.locator("#catalog-mobile-filters").evaluate((dialog) => dialog.open)) {
    failures.push("390 catalog-lab: Escape 未关闭移动筛选抽屉");
  }

  await page.goto(`${baseUrl}/catalog-lab/review`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(350);
  await page.keyboard.press("/");
  if ((await page.locator("input[type=search]").evaluate((input) => input === document.activeElement)) !== true) {
    failures.push("390 catalog-lab/review: / 未聚焦审核搜索");
  }
  await page.keyboard.press("Escape");
  await page.keyboard.press("Alt+d");
  if ((await page.locator("[aria-label='决策账本导出'] select").first().evaluate((select) => select === document.activeElement)) !== true) {
    failures.push("390 catalog-lab/review: Alt+D 未聚焦决策栏");
  }
  const reducedMotion = await page.evaluate(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  if (!reducedMotion) failures.push("390: 减弱动画媒体条件未生效");
  await context.close();
  return failures;
}

async function checkTextResize(browser, routes) {
  const exactCandidates = [
    "/",
    "/about",
    "/products",
    "/products/ceiling-lights",
    "/solutions",
    "/solutions/commercial",
    "/cases",
    "/news",
    "/knowledge",
    "/service",
    "/contact",
    "/catalog-lab",
    "/catalog-lab/review",
  ];
  const representativeRoutes = new Set(
    exactCandidates.filter((route) => routes.includes(route)),
  );
  const knowledgeArticle = routes.find((route) =>
    route.startsWith("/knowledge/"),
  );
  const newsArticle = routes.find((route) => route.startsWith("/news/"));
  if (knowledgeArticle) representativeRoutes.add(knowledgeArticle);
  if (newsArticle) representativeRoutes.add(newsArticle);
  const neutralSeries = routes.find((route) => route.startsWith("/products/catalog/"));
  if (neutralSeries) representativeRoutes.add(neutralSeries);

  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 320, height: 800 },
  });
  const page = await context.newPage();
  const failures = [];
  for (const route of representativeRoutes) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (!response || response.status() >= 400) {
      failures.push(`200% 文本 ${route}: HTTP ${response?.status() ?? "无响应"}`);
      continue;
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await page.waitForTimeout(100);
    const metrics = await page.evaluate(() => {
      window.scrollTo(document.documentElement.scrollWidth, 0);
      const maxScrollX = window.scrollX;
      window.scrollTo(0, 0);
      const heading = document.querySelector("main h1");
      const headingBox = heading?.getBoundingClientRect();
      return {
        maxScrollX,
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        headingVisible:
          Boolean(headingBox) &&
          headingBox.width > 0 &&
          headingBox.height > 0,
      };
    });
    if (metrics.rootFontSize !== "32px") {
      failures.push(`200% 文本 ${route}: 根字号为 ${metrics.rootFontSize}`);
    }
    if (metrics.maxScrollX > 1) {
      failures.push(
        `200% 文本 ${route}: 可横向滚动 ${metrics.maxScrollX}px`,
      );
    }
    if (!metrics.headingVisible) {
      failures.push(`200% 文本 ${route}: 主标题不可见`);
    }
  }
  await context.close();
  return {
    routeCount: representativeRoutes.size,
    failures,
  };
}

const routes = await routeInventory();
let browser;

try {
  browser = await launchBrowser();
  const viewportReports = [];
  for (let index = 0; index < viewports.length; index += 2) {
    viewportReports.push(
      ...(await Promise.all(
        viewports
          .slice(index, index + 2)
          .map((viewport) => checkViewport(browser, viewport, routes)),
      )),
    );
  }
  const interactionFailures = await checkWorkbenchInteractions(browser);
  const textResizeReport = await checkTextResize(browser, routes);
  const failures = [
    ...viewportReports.flatMap((report) => report.failures),
    ...interactionFailures,
    ...textResizeReport.failures,
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    routeCount: routes.length,
    viewportCount: viewports.length,
    checks: routes.length * viewports.length,
    textResizeRouteCount: textResizeReport.routeCount,
    passed: failures.length === 0,
    failureCount: failures.length,
    failures,
    viewports: viewportReports,
  };
  await mkdir(new URL("../reports/", import.meta.url), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length > 0) {
    console.error(
      `全路由视觉验收失败：${failures.length} 项。报告：${reportPath.pathname}\n${failures.slice(0, 40).join("\n")}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `全路由视觉验收通过：${routes.length} 条路由 × ${viewports.length} 个视口，共 ${report.checks} 次。`,
    );
  }
} finally {
  await browser?.close();
}
