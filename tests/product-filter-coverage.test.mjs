import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEngineeringFilterCoverage,
  engineeringFilterDefinitions,
} from "../content/product-filter-coverage.ts";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const products = readJson("../content/runtime/published-products.json");
const governance = readJson("../content/governance/product-engineering-filter-coverage.json");
const catalogPageSource = readFileSync(new URL("../features/catalog/CatalogPages.tsx", import.meta.url), "utf8");

test("computes the six engineering filter coverage counts from independent source fields", () => {
  const coverage = buildEngineeringFilterCoverage(products);
  assert.equal(products.length, 31);
  assert.deepEqual(
    Object.fromEntries(coverage.map((item) => [item.key, item.coveredProducts])),
    {
      power: 0,
      cct: 0,
      cri: 0,
      "beam-angle": 0,
      dimensions: 22,
      installation: 0,
    },
  );
  assert.ok(coverage.every((item) => item.filterEnabled === false));
  assert.equal(coverage.find((item) => item.key === "dimensions")?.missingProducts, 9);
  assert.equal(coverage.find((item) => item.key === "dimensions")?.state, "partial");
});

test("does not infer power, CCT, CRI, beam angle, dimensions, or installation from titles and composite fields", () => {
  const [sample] = buildEngineeringFilterCoverage([{
    title: "10W 3000K Ra90 24° 嵌入式 80mm",
    parameters: [{ name: "光源数量", value: "变光64W" }],
  }]);
  assert.equal(sample.coveredProducts, 0);
  assert.ok(buildEngineeringFilterCoverage([{
    parameters: [{ name: "尺寸", value: "D500*H100圆" }],
  }]).every((item) => item.filterEnabled === false));
});

test("keeps governance snapshot, runtime definitions, and the private preview UI aligned", () => {
  const coverage = buildEngineeringFilterCoverage(products);
  assert.equal(governance.scope.product_count, products.length);
  assert.equal(governance.scope.route_state, "private_preview");
  assert.equal(governance.scope.index_state, "noindex");
  assert.equal(governance.policy.title_inference_forbidden, true);
  assert.deepEqual(
    governance.dimensions.map(({ key, label, source_parameter_names }) => ({ key, label, source_parameter_names })),
    engineeringFilterDefinitions.map(({ key, label, parameterNames }) => ({ key, label, source_parameter_names: [...parameterNames] })),
  );
  for (const item of coverage) {
    const snapshot = governance.dimensions.find(({ key }) => key === item.key);
    assert.equal(snapshot.coverage_count, item.coveredProducts, item.key);
    assert.equal(snapshot.missing_count, item.missingProducts, item.key);
    assert.equal(snapshot.normalization_approved, item.normalizationApproved, item.key);
    assert.equal(snapshot.filter_state, "disabled", item.key);
  }
  assert.match(catalogPageSource, /data-filter-contract="SOURCE FIELD COVERAGE"/);
  assert.match(catalogPageSource, /<button type="button" disabled>资料不足，暂不可筛选<\/button>/);
  assert.match(catalogPageSource, /consultationHref\("project", "products", "model-confirmation"\)/);
});
