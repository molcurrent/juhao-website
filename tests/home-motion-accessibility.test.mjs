import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../features/home/HomePage.module.css");
const motion = read("../components/motion/HomeMotion.tsx");

test("keeps the large desktop hero title compact without overlapping its two lines", () => {
  const heroRule = css.match(/\.page :global\(\.hero h1\)\s*\{([^}]+)\}/)?.[1] ?? "";
  const lineHeight = Number(heroRule.match(/line-height:\s*([\d.]+)/)?.[1]);

  assert.ok(lineHeight >= 1, `expected desktop hero line-height >= 1, received ${lineHeight}`);
  assert.match(
    css,
    /@media \(max-width: 700px\)[\s\S]*?\.page :global\(\.hero h1\)\s*\{[\s\S]*?line-height:\s*\.96/,
  );
});

test("removes previous-stage smart cards from the accessibility tree and tab order", () => {
  assert.match(motion, /card\.inert = hidden/);
  assert.match(motion, /card\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(motion, /card\.setAttribute\("tabindex", "-1"\)/);
  assert.match(motion, /syncSmartCardAccessibility\(nextSmart\)/);
  assert.match(motion, /setSmartCardHidden\(card, index, index < activeIndex\)/);
  assert.match(motion, /accessibilitySnapshots\.forEach/);
});

test("renders every smart card as a non-overlapping static control for reduced motion", () => {
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.page :global\(\.smartExperience\)\s*\{[\s\S]*?position:\s*relative;[\s\S]*?top:\s*auto;/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.smartCard:nth-child\(4\)\s*\{[\s\S]*?position:\s*relative;[\s\S]*?top:\s*auto;[\s\S]*?opacity:\s*1 !important;[\s\S]*?transform:\s*none !important;/,
  );
});
