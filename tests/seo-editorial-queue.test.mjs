import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { REMOVED_PROFESSIONAL_ARTICLE_ROUTES } from "./fixtures/removed-professional-article-routes.mjs";

const ROOT = new URL("../", import.meta.url);
const queue = JSON.parse(readFileSync(new URL("content/governance/seo-editorial-queue.json", ROOT), "utf8"));
const pageSource = readFileSync(new URL("features/knowledge/KnowledgeLibraryPage.tsx", ROOT), "utf8");
const modelSource = readFileSync(new URL("content/seo-editorial-queue.ts", ROOT), "utf8");

test("keeps the three SEO content lanes as a noindex editorial queue", () => {
  assert.equal(queue.scope, "/knowledge");
  assert.equal(queue.publication_state, "editorial_queue_noindex");
  assert.equal(queue.indexable, false);
  assert.equal(queue.routes_created, false);
  assert.deepEqual(queue.required_gates, [
    "technical_source_review",
    "brand_signoff",
    "legal_signoff",
  ]);
  assert.deepEqual(
    queue.lanes.map(({ id, label }) => [id, label]),
    [
      ["light-environment-knowledge", "光环境知识"],
      ["project-cases", "项目案例"],
      ["product-technology", "产品技术"],
    ],
  );
});

test("schedules every requested keyword without inventing copy or routes", () => {
  const topics = queue.lanes.flatMap(({ topics }) => topics);
  assert.equal(topics.length, 7);
  assert.deepEqual(
    new Set(topics.map(({ target_keyword }) => target_keyword)),
    new Set(["客厅灯光设计", "酒店照明设计", "无主灯设计", "智能照明方案", "办公照明标准", "防眩射灯", "4000K 和 3000K 如何选择"]),
  );
  assert.equal(new Set(topics.map(({ id }) => id)).size, topics.length);

  for (const topic of topics) {
    assert.equal(topic.state, "brief_only", topic.id);
    assert.equal(topic.body_status, "not_written", topic.id);
    assert.equal(topic.route, null, topic.id);
    assert.equal(topic.indexable, false, topic.id);
    assert.ok(topic.working_title.includes(topic.target_keyword), topic.id);
    assert.ok(topic.source_requirements.length >= 2, topic.id);
    assert.deepEqual(topic.required_signoffs, queue.required_gates, topic.id);
  }
});

test("does not restore any of the 33 removed professional article routes", () => {
  assert.equal(REMOVED_PROFESSIONAL_ARTICLE_ROUTES.length, 33);
  assert.equal(queue.removed_professional_articles.route_count, REMOVED_PROFESSIONAL_ARTICLE_ROUTES.length);
  assert.equal(queue.removed_professional_articles.policy, "must_not_restore");

  const editorialSources = `${JSON.stringify(queue)}\n${pageSource}\n${modelSource}`;
  for (const route of REMOVED_PROFESSIONAL_ARTICLE_ROUTES) {
    assert.doesNotMatch(editorialSources, new RegExp(route.replaceAll("/", "\\/")), route);
  }
});

test("renders the queue separately from the source-numbered historical archive", () => {
  assert.match(pageSource, /seoEditorialQueue\.lanes\.map/);
  assert.match(pageSource, /三条内容线，只排选题，不冒充已发布文章/);
  assert.match(pageSource, /仅编辑选题/);
  assert.match(pageSource, /未写正文/);
  assert.match(pageSource, /未创建路由/);
  assert.match(pageSource, /以下内容与上方原创编辑队列相互独立/);
  assert.doesNotMatch(pageSource, /href=\{topic\.(?:route|path|href)\}/);
});
