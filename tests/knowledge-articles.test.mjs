import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const packetPath = process.env.JUHAO_KNOWLEDGE_PACKET ?? "/Users/mac/Documents/Codex/2026-07-13/juhao-website-handoff-md-users-mac/work/content-source-packets/knowledge_approved_12.json";
const packet = existsSync(packetPath) ? JSON.parse(readFileSync(packetPath, "utf8")) : null;
const dataSource = readFileSync(new URL("../content/knowledge-articles.ts", import.meta.url), "utf8");
const articleSource = readFileSync(new URL("../features/news/NewsArticlePage.tsx", import.meta.url), "utf8");
const newsSource = readFileSync(new URL("../features/news/NewsPage.tsx", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/[...slug]/page.tsx", import.meta.url), "utf8");
const mockApiSource = readFileSync(new URL("../lib/api/mock.ts", import.meta.url), "utf8");

test("preserves all 12 approved knowledge sources and content boundaries", { skip: packet ? false : `source packet not available: ${packetPath}` }, () => {
  assert.equal(packet.count, 12);
  assert.equal(packet.items.length, 12);

  for (const item of packet.items) {
    assert.equal(item.frontmatter.review_state, "approved_by_juhao", item.source_key);
    assert.equal(item.frontmatter.reviewer, "JUHAO", item.source_key);
    for (const value of [
      item.source_path,
      item.source_key,
      item.frontmatter.source,
      item.frontmatter.reviewed_at,
      item.frontmatter.source_checked_at,
      ...item.source_urls,
      ...item.core_conclusions,
      ...item.do_not_say,
    ]) assert.ok(dataSource.includes(JSON.stringify(value)), `${item.source_key}: missing ${value}`);
  }

  const slugs = [...dataSource.matchAll(/slug: "([a-z0-9-]+)"/g)].map((match) => match[1]);
  assert.equal(slugs.length, 12);
  assert.equal(new Set(slugs).size, 12);
  assert.doesNotMatch(dataSource, /image:\s*"https?:\/\//);
  assert.match(dataSource, /role: "representative_not_evidence"/);
  assert.match(dataSource, /provenancePath: "RECON\/JUHAO_ASSET_PROVENANCE\.md"/);
  assert.doesNotMatch(dataSource, /published:\s*seed\.reviewedAt/);
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
  assert.match(routeSource, /\.\.\.\(page\.published \? \{ datePublished:page\.published \} : \{\}\)/);
  assert.doesNotMatch(routeSource, /const schema = page\.noindex/);
});

test("keeps client-side news hydration on published ledger routes in deterministic date order", () => {
  assert.match(mockApiSource, /page\.type === "article" && isPublishedRoute\(page\.path\)/);
  assert.match(mockApiSource, /right\.published[\s\S]*localeCompare\(left\.published/);
  assert.match(mockApiSource, /dateOrder \|\| left\.path\.localeCompare\(right\.path\)/);
});
