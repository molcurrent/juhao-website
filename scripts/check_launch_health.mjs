const baseUrl = (process.env.BASE_URL || "https://juhao.com").replace(/\/$/, "");
const expectedRoutes = ["/", "/products", "/products/spotlights/12287", "/cases", "/about/history", "/service", "/partners", "/contact"];
const spamPaths = ["/static/news/9062.html", "/static/news/1689.html", "/static/news/1022.html", "/static/news/3649.html", "/static/news/5795.html", "/static/news/8058.html"];
const failures = [];

for (const path of expectedRoutes) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const html = await response.text();
  if (response.status !== 200) failures.push(`${path}: expected 200, got ${response.status}`);
  if (!html.includes("rel=\"canonical\"")) failures.push(`${path}: canonical missing`);
  if (/nvc-lighting|雷士|cnzz/i.test(html)) failures.push(`${path}: residual source brand or tracker`);
}

for (const path of spamPaths) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (response.status !== 410) failures.push(`${path}: expected 410, got ${response.status}`);
  if (!/noindex/i.test(response.headers.get("x-robots-tag") || "")) failures.push(`${path}: x-robots-tag noindex missing`);
}

const login = await fetch(`${baseUrl}/login.html`, { redirect: "manual" });
if (![301, 308].includes(login.status) || login.headers.get("location") !== "https://mall.juhao.com/login.html") failures.push(`/login.html: invalid mall redirect (${login.status} ${login.headers.get("location")})`);

const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
const sitemapXml = await sitemap.text();
const urlCount = (sitemapXml.match(/<loc>/g) || []).length;
if (sitemap.status !== 200 || urlCount < 60) failures.push(`/sitemap.xml: expected at least 60 URLs, got ${urlCount}`);

if (failures.length) {
  console.error(JSON.stringify({ baseUrl, ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ baseUrl, ok: true, checkedRoutes: expectedRoutes.length, spam410: spamPaths.length, sitemapUrls: urlCount }, null, 2));
