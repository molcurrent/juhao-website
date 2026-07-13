import assert from "node:assert/strict";
import test from "node:test";
import { companyNewsArticleByPath, companyNewsArticles, companyNewsByPath } from "../content/company-news.ts";

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

test("contains the eight stable source records with their real SQL dates", () => {
  assert.equal(companyNewsArticles.length, 8);
  assert.deepEqual(companyNewsArticles.map(({ source_id }) => source_id), [...expected.keys()]);
  assert.equal(new Set(companyNewsArticles.map(({ path }) => path)).size, 8);
  assert.equal(companyNewsByPath.size, 8);

  for (const article of companyNewsArticles) {
    const [path, createTime] = expected.get(article.source_id);
    assert.equal(article.path, path);
    assert.equal(article.create_time, createTime);
    assert.equal(article.published, createTime.slice(0, 10));
    assert.equal(article.source_locator, `jh_articles.articleId=${article.source_id}`);
    assert.equal(article.source_status.is_show, "1");
    assert.equal(article.source_status.data_flag, "1");
    assert.equal(article.source_status.interpretation, "active_in_source");
    assert.equal(companyNewsArticleByPath(path), article);
  }
});

test("keeps every remote cover and body candidate blocked for rights review", () => {
  const media = companyNewsArticles.flatMap((article) => article.remote_media);
  assert.equal(media.length, 125);
  assert.equal(media.filter(({ role }) => role === "cover").length, 8);
  assert.equal(media.filter(({ role }) => role === "body").length, 117);

  for (const article of companyNewsArticles) {
    const expectedBodyCount = expected.get(article.source_id)[2];
    assert.equal(article.remote_media.filter(({ role }) => role === "cover").length, 1);
    assert.equal(article.remote_media.filter(({ role }) => role === "body").length, expectedBodyCount);
  }
  for (const candidate of media) {
    assert.match(candidate.src, /^https?:\/\//);
    assert.equal(candidate.rights_status, "needs_review");
    assert.equal(candidate.publish_allowed, false);
    assert.equal(candidate.evidence_role, "candidate_not_published");
    assert.equal(candidate.publication_gate, "public_media_authorization_not_verified");
  }
});

test("uses local visuals only as approved column illustrations, never as news evidence", () => {
  const allowed = new Set([
    "/images/juhao-public.webp",
    "/images/juhao-commercial.webp",
    "/images/juhao-home.webp",
  ]);
  for (const article of companyNewsArticles) {
    const media = article.local_representative_media;
    assert.ok(allowed.has(media.src));
    assert.equal(media.role, "section_illustration");
    assert.equal(media.evidence_role, "representative_not_evidence");
    assert.equal(media.rights_status, "approved");
    assert.equal(media.provenance_path, "RECON/JUHAO_ASSET_PROVENANCE.md");
    assert.match(media.alt, /原创/);
    assert.match(media.alt, /栏目示意图/);
    assert.match(media.alt, /不作为/);
  }
});

test("limits page-facing copy to the conservative summary and excludes promotional claims", () => {
  const promotionalTerms = /火热|强势|硬核|络绎不绝|重磅|上万平方|备受瞩目|盛大|圆满|辉煌|卓越|璀璨|奢华|极高|领军实力|典范之作|首选品牌/;

  for (const article of companyNewsArticles) {
    const copy = pageCopy(article);
    assert.equal(article.governance.page_copy_basis, "phase_conservative_summary_only");
    assert.equal(article.intro, article.description);
    assert.notEqual(article.description, article.governance.source_description);
    assert.ok(article.sections[0].text);
    assert.ok(article.sections[0].points.length >= 1);
    assert.equal(article.sections[1].text, article.phase_conservative_summary.publication_boundary);
    assert.equal(article.publication_boundary, article.phase_conservative_summary.publication_boundary);
    assert.doesNotMatch(copy, promotionalTerms, article.path);

    for (const claim of article.governance.excluded_unverified_claims) {
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
    }
  }
});
