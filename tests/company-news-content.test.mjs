import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { companyNewsArticleByPath, companyNewsArticles, companyNewsByPath } from "../content/company-news.ts";
import { resolveConsultationContext } from "../lib/consultation.ts";

const governancePath = new URL("../content/governance/company-news-source.json", import.meta.url);
const runtimePath = new URL("../content/runtime/company-news.json", import.meta.url);
const governance = JSON.parse(readFileSync(governancePath, "utf8"));
const governanceById = new Map(governance.map((article) => [article.source_id, article]));

const expected = new Map([
  [232, ["/news/guangzhou-international-lighting-exhibition-2026", "2026-06-11 16:30:57", 13]],
  [224, ["/news/dealer-conference-spring-2026", "2026-03-17 10:06:09", 31]],
  [223, ["/news/lighting-industry-top10-source-record-2026", "2026-01-20 11:10:26", 4]],
  [222, ["/news/home-lighting-brand-source-record-2025", "2026-01-20 11:05:11", 3]],
  [221, ["/news/yichang-shouhang-hotel-bid", "2025-12-11 09:58:13", 22]],
  [219, ["/news/kunming-guandu-wyndham-hotel-bid", "2025-11-21 09:30:41", 14]],
  [218, ["/news/dalian-jinzhou-crowne-plaza-hotel-bid", "2025-08-12 09:27:23", 10]],
  [217, ["/news/nanyandangshan-binyue-resort-hotel-bid", "2025-08-11 10:53:37", 20]],
]);

function pageCopy(article) {
  return [
    article.title,
    article.description,
    article.intro,
    ...article.sections.flatMap((section) => [section.title, section.text, ...section.points]),
  ].join("\n");
}

test("contains the eight stable runtime records with their real source dates", () => {
  assert.equal(companyNewsArticles.length, 8);
  assert.deepEqual(companyNewsArticles.map(({ source_id }) => source_id), [...expected.keys()]);
  assert.equal(new Set(companyNewsArticles.map(({ path }) => path)).size, 8);
  assert.equal(companyNewsByPath.size, 8);

  for (const article of companyNewsArticles) {
    const [path, createTime, expectedBodyCount] = expected.get(article.source_id);
    const source = governanceById.get(article.source_id);
    assert.equal(article.path, path);
    assert.equal(article.published, createTime.slice(0, 10));
    assert.equal(article.remote_media_count, expectedBodyCount + 1);
    assert.equal(source.create_time, createTime);
    assert.equal(source.source_locator, `jh_articles.articleId=${article.source_id}`);
    assert.deepEqual(source.source_status, { is_show: "1", data_flag: "1", interpretation: "active_in_source" });
    assert.equal(companyNewsArticleByPath(path), article);
  }
});

test("keeps all 125 remote candidates in governance and out of the runtime snapshot", () => {
  const candidates = governance.flatMap((article) => article.remote_media_sources);
  const runtimeText = readFileSync(runtimePath, "utf8");
  assert.equal(candidates.length, 125);
  assert.equal(candidates.filter(({ role }) => role === "cover").length, 8);
  assert.equal(candidates.filter(({ role }) => role === "body").length, 117);
  for (const candidate of candidates) {
    assert.match(candidate.src, /^https?:\/\//);
    assert.equal(candidate.publication_gate, "content_fact_and_page_selection_review_pending");
  }
  assert.doesNotMatch(runtimeText, /https?:\/\//);
  assert.doesNotMatch(runtimeText, /\/Users\//);
  for (const article of companyNewsArticles) {
    for (const forbidden of [
      "create_time",
      "source_path",
      "source_locator",
      "source_sql_sha256",
      "source_status",
      "phase_conservative_summary",
      "remote_media_sources",
      "remote_media",
      "governance",
    ]) assert.equal(Object.hasOwn(article, forbidden), false, `${article.path}: leaked ${forbidden}`);
  }
});

test("rebuilds the slim runtime snapshot deterministically", () => {
  execFileSync("python3", ["scripts/build_company_news_runtime.py", "--check"], {
    cwd: new URL("..", import.meta.url),
    stdio: "pipe",
  });
});

test("uses local visuals only as approved column illustrations, never as news evidence", () => {
  const allowed = new Set([
    "/images/jh48-news-light-fair.webp",
    "/images/jh48-news-dealer.webp",
    "/images/jh48-news-brand-award.webp",
    "/images/jh48-news-home-brand.webp",
    "/images/jh48-news-yichang-hotel.webp",
    "/images/jh48-news-kunming-hotel.webp",
    "/images/jh48-news-dalian-hotel.webp",
    "/images/jh48-news-nanyan-resort.webp",
  ]);
  assert.equal(new Set(companyNewsArticles.map((article) => article.local_representative_media.src)).size, companyNewsArticles.length);
  for (const article of companyNewsArticles) {
    const media = article.local_representative_media;
    assert.ok(allowed.has(media.src));
    assert.equal(media.role, "section_illustration");
    assert.equal(media.evidence_role, "representative_not_evidence");
    assert.equal(media.rights_status, "approved");
    assert.equal(media.provenance_path, "RECON/JUHAO_ASSET_PROVENANCE.md");
    assert.match(media.alt, /原创/);
    assert.match(media.alt, /(?:栏目|场景)示意图/);
    assert.match(media.alt, /不作为/);
  }
});

test("limits page-facing copy to the conservative summary and excludes promotional claims", () => {
  const promotionalTerms = /火热|强势|硬核|络绎不绝|重磅|上万平方|备受瞩目|盛大|圆满|辉煌|卓越|璀璨|奢华|极高|领军实力|典范之作|首选品牌/;

  for (const article of companyNewsArticles) {
    const source = governanceById.get(article.source_id);
    const copy = pageCopy(article);
    assert.equal(source.governance.page_copy_basis, "phase_conservative_summary_only");
    assert.equal(article.intro, article.description);
    assert.notEqual(article.description, source.governance.source_description);
    assert.ok(article.sections[0].text);
    assert.ok(article.sections[0].points.length >= 1);
    assert.equal(article.phase_stage, source.phase_conservative_summary.stage);
    assert.equal(article.sections[1].text, source.phase_conservative_summary.publication_boundary);
    assert.equal(article.publication_boundary, source.phase_conservative_summary.publication_boundary);
    assert.doesNotMatch(copy, promotionalTerms, article.path);

    for (const claim of source.governance.excluded_unverified_claims) {
      assert.ok(!copy.includes(claim.text), `${article.path}: leaked unverified claim`);
    }
  }
});

test("keeps hotel project records at bid-report stage with later implementation unverified", () => {
  const bidIds = new Set([221, 219, 218, 217]);
  for (const article of companyNewsArticles) {
    if (!bidIds.has(article.source_id)) {
      assert.equal(article.project_stage, null);
      continue;
    }
    assert.deepEqual(article.project_stage, { confirmed: "中标报道", implementation: "后续实施待证" });
    assert.match(article.title, /中标报道/);
    assert.match(article.description, /中标报道阶段/);
    assert.match(article.description, /待证/);
    assert.equal(article.publication_boundary, "未确认施工、供货、交付或完工状态。");
  }
});

test("provides at least two existing destination types for every article", () => {
  const allowedDestinations = [
    "/about/history",
    "/partners",
    "/cases",
    "/solutions/residential",
    "/solutions/hospitality",
    "/contact?",
  ];
  for (const article of companyNewsArticles) {
    assert.ok(article.related.length >= 2, article.path);
    assert.equal(new Set(article.related.map(({ href }) => href)).size, article.related.length);
    for (const link of article.related) {
      assert.ok(allowedDestinations.some((prefix) => link.href.startsWith(prefix)), `${article.path}: ${link.href}`);
      assert.ok(link.label);
      assert.ok(link.text);
      if (link.href.startsWith("/contact?")) {
        const url = new URL(link.href, "https://juhao.com");
        const context = resolveConsultationContext(Object.fromEntries(url.searchParams));
        assert.ok(context, `${article.path}: invalid consultation context`);
        assert.equal(context.source, "page");
        assert.equal(context.sourceDetail, article.path.split("/").at(-1));
      }
    }
  }
});
