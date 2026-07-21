import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { REMOVED_PROFESSIONAL_ARTICLE_ROUTES } from "./fixtures/removed-professional-article-routes.mjs";

const ROOT = new URL("../", import.meta.url);
const optionalText = (path) => existsSync(new URL(path, ROOT)) ? readFileSync(new URL(path, ROOT), "utf8") : "";
const optionalJson = (path) => {
  const source = optionalText(path);
  return source ? JSON.parse(source) : [];
};

const governanceKnowledge = optionalJson("content/governance/knowledge-articles.generated.json");
const ledger = JSON.parse(readFileSync(new URL("content/governance/content-ledger.json", ROOT), "utf8"));
const runtimeLedger = JSON.parse(readFileSync(new URL("content/runtime/publication-ledger.json", ROOT), "utf8"));
const routeOg = JSON.parse(readFileSync(new URL("content/governance/route-og.json", ROOT), "utf8"));
const companyNews = JSON.parse(readFileSync(new URL("content/runtime/company-news.json", ROOT), "utf8"));

test("prevents generic professional articles from being regenerated or published", () => {
  assert.equal(REMOVED_PROFESSIONAL_ARTICLE_ROUTES.length, 33);
  assert.deepEqual(governanceKnowledge, []);

  const removed = new Set(REMOVED_PROFESSIONAL_ARTICLE_ROUTES);
  for (const [label, records] of [["governance ledger", ledger], ["runtime ledger", runtimeLedger], ["OG manifest", routeOg]]) {
    assert.equal(records.some(({ route }) => removed.has(route)), false, label);
  }

  const sourceFiles = [
    "app/_data/pages.ts",
    "content/knowledge-articles.ts",
    "content/scene-resources.ts",
    "content/topic-guides.ts",
    "features/home/HomePage.tsx",
    "features/smart-home/SmartHomePage.tsx",
    "features/solutions/SolutionsPages.tsx",
  ];
  const runtimeSources = sourceFiles.map((path) => optionalText(path)).join("\n");
  for (const route of removed) assert.doesNotMatch(runtimeSources, new RegExp(route.replaceAll("/", "\\/")), route);
  assert.doesNotMatch(runtimeSources, /knowledge_base_professional_article_review|专业灯光知识库|已审核知识文章/);
});

test("keeps the news center limited to eight JUHAO company and project records", () => {
  assert.equal(companyNews.length, 8);
  assert.equal(new Set(companyNews.map(({ path }) => path)).size, 8);
  assert.ok(companyNews.every(({ path, source_id }) => path.startsWith("/news/") && Number.isInteger(source_id)));

  const articles = ledger.filter(({ content_type }) => content_type === "文章");
  assert.equal(articles.length, 8);
  assert.ok(articles.every(({ source_type }) => source_type === "mall_sql_jh_articles"));
  assert.deepEqual(
    articles.map(({ route }) => route).sort(),
    companyNews.map(({ path }) => path).sort(),
  );
});

test("keeps semantic media and structured data gates for JUHAO news", () => {
  const articleSource = readFileSync(new URL("features/news/NewsArticlePage.tsx", ROOT), "utf8");
  const newsSource = readFileSync(new URL("features/news/NewsPage.tsx", ROOT), "utf8");
  const routeSource = readFileSync(new URL("app/[...slug]/page.tsx", ROOT), "utf8");
  const newsModelSource = readFileSync(new URL("lib/news.ts", ROOT), "utf8");

  assert.match(articleSource, /<Image/);
  assert.match(articleSource, /companyNewsEvidence/);
  assert.match(articleSource, /来源记录/);
  assert.match(articleSource, /公开边界/);
  assert.match(newsSource, /<figure className=\{styles\.heroMedia\}>[\s\S]*?<Image/);
  assert.match(newsSource, /className=\{styles\.featuredVisual\}/);
  assert.doesNotMatch(newsSource, /<figure className=\{styles\.featuredImage\}>/);
  assert.doesNotMatch(newsSource, /backgroundImage:/);
  assert.match(routeSource, /const schema = indexable \? \[/);
  assert.match(routeSource, /const faqSchema = indexable &&/);
  assert.match(newsModelSource, /page\.type === "article" && isPublishedRoute\(page\.path\)/);
  assert.match(newsModelSource, /right\.published[\s\S]*localeCompare\(left\.published/);
  assert.doesNotMatch(newsSource, /"use client"|siteApi|useEffect|useState/);
});
