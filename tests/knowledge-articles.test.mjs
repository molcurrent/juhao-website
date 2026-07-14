import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const knowledge = JSON.parse(readFileSync(new URL("../content/governance/knowledge-articles.generated.json", import.meta.url), "utf8"));
const dataSource = readFileSync(new URL("../content/knowledge-articles.ts", import.meta.url), "utf8");
const articleSource = readFileSync(new URL("../features/news/NewsArticlePage.tsx", import.meta.url), "utf8");
const newsSource = readFileSync(new URL("../features/news/NewsPage.tsx", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8");
const mockApiSource = readFileSync(new URL("../lib/api/mock.ts", import.meta.url), "utf8");

test("ships a portable snapshot of all 33 JUHAO-approved knowledge articles", () => {
  const expectedNewSlugs = new Set([
    "led-lifetime-reliability", "chinese-style-chandelier-guide", "power-factor-harmonics",
    "bedroom-night-lighting", "kitchen-task-lighting", "commercial-lighting-guide",
    "living-room-tv-wall-lighting", "home-lighting-guide", "switch-panels-bathroom-heaters",
    "reading-desk-lamp-guide", "smart-lighting-scene-control", "crystal-chandelier-guide",
    "lumens-watts-lux-efficacy", "home-lighting-selection-checklist", "glare-control-ugr",
    "color-tolerance-duv", "art-lighting-guide", "blue-light-photobiological-safety",
    "vanity-makeup-lighting", "ceiling-fan-light-guide", "dining-table-lighting",
  ]);

  assert.equal(knowledge.length, 33);
  assert.equal(new Set(knowledge.map(({ slug }) => slug)).size, 33);
  assert.equal(knowledge.filter(({ slug }) => expectedNewSlugs.has(slug)).length, 21);
  for (const item of knowledge) {
    assert.equal(item.reviewState, "approved_by_juhao", item.sourceKey);
    assert.equal(item.reviewer, "JUHAO", item.sourceKey);
    assert.match(item.sourceHash, /^[a-f0-9]{64}$/, item.sourceKey);
    assert.match(item.sourcePath, /^专业灯光知识库\/.+\.md$/, item.sourceKey);
    assert.doesNotMatch(item.sourcePath, /^\//, item.sourceKey);
    assert.ok(item.coreConclusions.length > 0, item.sourceKey);
    assert.ok(item.doNotSay.length > 0, item.sourceKey);
    assert.equal(item.externalSourceStatus, item.sourceUrls.length ? "recorded" : "not_recorded");
    if (!item.sourceUrls.length) assert.equal(item.sourceDisclosure, "本文已完成 JUHAO 内部知识库审核，外部来源链接未记录。");
  }

  const scalarYamlArticle = knowledge.find(({ slug }) => slug === "chinese-style-chandelier-guide");
  assert.equal(scalarYamlArticle.sourceUrls.length, 3);
  assert.ok(scalarYamlArticle.tags.length >= 3);
  assert.equal(knowledge.find(({ slug }) => slug === "home-lighting-selection-checklist").boundaryTitle, "资料使用边界");
  assert.ok(knowledge.find(({ slug }) => slug === "lumens-watts-lux-efficacy").supportingSections.some(({ title }) => title === "使用边界"));

  assert.match(dataSource, /knowledge-articles\.generated\.json/);
  assert.match(dataSource, /外部来源链接未记录/);
  assert.match(dataSource, /role: "representative_not_evidence"/);
  assert.match(dataSource, /provenancePath: "RECON\/JUHAO_ASSET_PROVENANCE\.md"/);
  assert.doesNotMatch(dataSource, /published:\s*seed\.reviewedAt|\/Users\/mac/);
});

test("renders semantic article media, review evidence, sources and related paths", () => {
  assert.match(articleSource, /<Image/);
  assert.match(articleSource, /width=\{media\?\.width/);
  assert.match(articleSource, /height=\{media\?\.height/);
  assert.match(articleSource, /审核主体/);
  assert.match(articleSource, /审核日期 <time dateTime=\{evidence\.reviewedAt\}>/);
  assert.match(articleSource, /来源核对/);
  assert.match(articleSource, /evidence\.sourceUrls\.map/);
  assert.match(articleSource, /evidence\.coreConclusions\.map/);
  assert.match(articleSource, /evidence\.doNotSay\.map/);
  assert.match(articleSource, /page\.related\.map/);
});

test("uses semantic images for the news hero and featured article", () => {
  assert.match(newsSource, /<figure className=\{styles\.heroMedia\}>[\s\S]*?<Image/);
  assert.match(newsSource, /<figure className=\{styles\.featuredImage\}>[\s\S]*?<Image/);
  assert.doesNotMatch(newsSource, /backgroundImage:/);
  assert.match(newsSource, /width=\{1672\}/);
  assert.match(newsSource, /height=\{941\}/);
});

test("keeps structured data behind the unified indexability gate", () => {
  assert.match(routeSource, /const schema = indexable \? \[/);
  assert.match(routeSource, /const faqSchema = indexable &&/);
  assert.match(routeSource, /\.\.\.\(publishedAt \? \{ datePublished:publishedAt, dateModified:publishedAt \} : \{\}\)/);
  assert.doesNotMatch(routeSource, /datePublished:page\.articleEvidence\?\.reviewedAt|modifiedTime: page\.articleEvidence\.reviewedAt/);
  assert.doesNotMatch(routeSource, /const schema = page\.noindex/);
});

test("keeps server-rendered news on published ledger routes in deterministic date order", () => {
  assert.match(mockApiSource, /page\.type === "article" && isPublishedRoute\(page\.path\)/);
  assert.match(mockApiSource, /right\.published[\s\S]*localeCompare\(left\.published/);
  assert.match(mockApiSource, /dateOrder \|\| left\.path\.localeCompare\(right\.path\)/);
  assert.doesNotMatch(newsSource, /"use client"|siteApi|useEffect|useState/);
});
