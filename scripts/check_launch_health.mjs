const baseUrl = (process.env.BASE_URL || "https://juhao.com").replace(/\/$/, "");
const mallBaseUrl = (process.env.MALL_BASE_URL || "https://mall.juhao.com").replace(/\/$/, "");
const siteBypassToken = process.env.OAI_SITES_BYPASS_TOKEN || "";
const checkMall = process.env.CHECK_MALL === "1";
const expectedRoutes = ["/", "/products", "/products/spotlights/12287", "/cases", "/about/history", "/service", "/partners", "/contact"];
const spamPaths = ["/static/news/9062.html", "/static/news/1689.html", "/static/news/1022.html", "/static/news/3649.html", "/static/news/5795.html", "/static/news/8058.html"];
const failures = [];
const siteHeaders = siteBypassToken ? { "OAI-Sites-Authorization": `Bearer ${siteBypassToken}` } : {};

async function request(url, options, label) {
  try {
    return await fetch(url, options);
  } catch (error) {
    failures.push(`${label}: network failure (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

for (const path of expectedRoutes) {
  const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path);
  if (!response) continue;
  const html = await response.text();
  if (response.status !== 200) failures.push(`${path}: expected 200, got ${response.status}`);
  if (!html.includes("rel=\"canonical\"")) failures.push(`${path}: canonical missing`);
  if (/nvc-lighting|雷士|cnzz/i.test(html)) failures.push(`${path}: residual source brand or tracker`);
}

for (const path of spamPaths) {
  const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path);
  if (!response) continue;
  if (response.status !== 410) failures.push(`${path}: expected 410, got ${response.status}`);
  if (!/noindex/i.test(response.headers.get("x-robots-tag") || "")) failures.push(`${path}: x-robots-tag noindex missing`);
}

const login = await request(`${baseUrl}/login.html`, { redirect: "manual", headers: siteHeaders }, "/login.html");
if (login && (![301, 308].includes(login.status) || login.headers.get("location") !== `${mallBaseUrl}/login.html`)) failures.push(`/login.html: invalid mall redirect (${login.status} ${login.headers.get("location")})`);

const sitemap = await request(`${baseUrl}/sitemap.xml`, { headers: siteHeaders }, "/sitemap.xml");
const sitemapXml = sitemap ? await sitemap.text() : "";
const urlCount = (sitemapXml.match(/<loc>/g) || []).length;
if (sitemap && (sitemap.status !== 200 || urlCount < 60)) failures.push(`/sitemap.xml: expected at least 60 URLs, got ${urlCount}`);

if (checkMall) {
  for (const path of ["/", "/login.html"]) {
    const response = await request(`${mallBaseUrl}${path}`, { redirect: "manual" }, `mall${path}`);
    if (response && (response.status < 200 || response.status >= 400)) failures.push(`mall${path}: expected 2xx/3xx, got ${response.status}`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ baseUrl, ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ baseUrl, mallBaseUrl, mallChecked: checkMall, ok: true, checkedRoutes: expectedRoutes.length, spam410: spamPaths.length, sitemapUrls: urlCount }, null, 2));
