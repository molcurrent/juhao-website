import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const runtimeLedger = JSON.parse(readFileSync(resolve(ROOT, "content/runtime/publication-ledger.json"), "utf8"));
const publicCatalogRuntime = JSON.parse(readFileSync(resolve(ROOT, "content/runtime/catalog-v2-public/index.json"), "utf8"));
const fullCatalogReadiness = JSON.parse(readFileSync(resolve(ROOT, "content/governance/product-catalog-v2-full-release-readiness.json"), "utf8"));
const manualApprovalQueue = readFileSync(resolve(ROOT, "content/governance/manual-approval-queue.csv"), "utf8");
const publishedRecords = runtimeLedger.filter((record) => record.publish_status === "published");
const eligibleRecords = publishedRecords.filter((record) => record.index_eligible);

function enabled(value) {
  return ["1", "true"].includes((value || "false").toLowerCase());
}

const baseUrl = (process.env.BASE_URL || "https://juhao.com").replace(/\/$/, "");
const mallBaseUrl = (process.env.MALL_BASE_URL || "https://mall.juhao.com").replace(/\/$/, "");
const siteBypassToken = process.env.OAI_SITES_BYPASS_TOKEN || "";
const checkMall = process.env.CHECK_MALL === "1";
const publicIndexingEnabled = enabled(process.env.PUBLIC_INDEXING_ENABLED);
const canonicalHostApproved = enabled(process.env.CANONICAL_HOST_APPROVED);
const publicIntakeReady = enabled(process.env.PUBLIC_INTAKE_READY);
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim() || "";
const turnstileAllowedHostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
  .split(",")
  .map((hostname) => hostname.trim())
  .filter(Boolean);
const contactEdgeRateLimitVerified = enabled(process.env.CONTACT_EDGE_RATE_LIMIT_VERIFIED);
const webhookUrl = process.env.JUHAO_LEAD_WEBHOOK_URL?.trim() || "";
const webhookSecret = process.env.JUHAO_LEAD_WEBHOOK_SECRET?.trim() || "";
const maintenanceSecret = process.env.JUHAO_LEAD_MAINTENANCE_SECRET?.trim() || "";
const rateLimitSecret = process.env.JUHAO_LEAD_RATE_LIMIT_SECRET?.trim() || "";
const analyticsClientEnabled = enabled(process.env.NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED);
const analyticsWriteEnabled = enabled(process.env.PRIVACY_ANALYTICS_WRITE_ENABLED);
const analyticsD1MigrationVerified = enabled(process.env.ANALYTICS_D1_MIGRATION_VERIFIED);
const analyticsClientBuildVerified = enabled(process.env.ANALYTICS_CLIENT_BUILD_VERIFIED);
const analyticsEdgeRateLimitVerified = enabled(process.env.ANALYTICS_EDGE_RATE_LIMIT_VERIFIED);
const analyticsPrivacyApproved = enabled(process.env.ANALYTICS_PRIVACY_APPROVED);
const releaseGateOnly = process.argv.includes("--release-gate");
const expectedRoutes = publishedRecords.map((record) => record.route);
const publicCatalogItems = Array.isArray(publicCatalogRuntime.items)
  ? publicCatalogRuntime.items
  : [];
const activePublicCatalogItems = publicCatalogRuntime.publication_state === "active_public_indexable"
  ? publicCatalogItems.filter((item) => typeof item?.canonical_path === "string")
  : [];
const expectedPublicSitemapRoutes = [
  ...new Set([
    ...eligibleRecords.map((record) => record.canonical_slug),
    ...(publicIndexingEnabled
      ? activePublicCatalogItems.map((item) => item.canonical_path)
      : []),
  ]),
].sort();
const spamPaths = ["/static/news/9062.html", "/static/news/1689.html", "/static/news/1022.html", "/static/news/3649.html", "/static/news/5795.html", "/static/news/8058.html"];
const siteHeaders = siteBypassToken ? { "OAI-Sites-Authorization": `Bearer ${siteBypassToken}` } : {};

export const EXPECTED_PUBLIC_SITEMAP_URLS = expectedPublicSitemapRoutes.length;

export function validTurnstileAllowedHostnames(values) {
  if (!Array.isArray(values) || values.length === 0) return false;
  return values.every((value) => {
    const hostname = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!hostname || hostname.startsWith(".") || hostname.endsWith(".") || hostname.includes("..")) return false;
    try {
      const parsed = new URL(`https://${hostname}`);
      return parsed.hostname === hostname
        && !parsed.port
        && parsed.pathname === "/"
        && !parsed.search
        && !parsed.hash
        && !parsed.username
        && !parsed.password;
    } catch {
      return false;
    }
  });
}

function csvFields(line) {
  const fields = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  fields.push(value);
  return fields;
}

export function manualApprovalSummary(csvText) {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = csvFields(lines.shift() || "");
  const rows = lines.map((line) => {
    const fields = csvFields(line);
    return Object.fromEntries(headers.map((header, index) => [header, fields[index] || ""]));
  });
  const completed = rows.filter((row) =>
    ["approved", "已签核"].includes(row.status.trim().toLowerCase())
      && row.decision.trim()
      && row.reviewed_at.trim(),
  ).length;
  return { total: rows.length, completed, pending: rows.length - completed };
}

export const MANUAL_APPROVALS = manualApprovalSummary(manualApprovalQueue);

export function fullCatalogReleaseFailures({
  catalogReady = (
    fullCatalogReadiness.public_release_eligible === true
    && publicCatalogRuntime.publication_state === "active_public_indexable"
  ),
} = {}) {
  return catalogReady
    ? []
    : ["public launch blocked: full product catalog release is not eligible"];
}

export function hasNoindexRobotsMeta(html) {
  return (html.match(/<meta\b[^>]*>/gi) || []).some((tag) => {
    const name = tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() || "";
    return name === "robots" && content.split(/[\s,]+/).includes("noindex");
  });
}

export function indexingPolicyFailures({ html, path, sitemapStatus, sitemapRoutes, shouldIndex = false, expectedSitemapRoutes = [] }) {
  const failures = [];

  if (typeof html === "string") {
    const noindex = hasNoindexRobotsMeta(html);
    if (shouldIndex && noindex) failures.push(`${path}: eligible public route must not include robots noindex`);
    if (!shouldIndex && !noindex) failures.push(`${path}: route must include robots noindex`);
  }

  if (typeof sitemapStatus === "number" && Array.isArray(sitemapRoutes)) {
    if (sitemapStatus !== 200) failures.push(`/sitemap.xml: expected 200, got ${sitemapStatus}`);
    const actual = [...sitemapRoutes].sort();
    const expected = [...expectedSitemapRoutes].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`/sitemap.xml: expected exact ${expected.length}-route set, got ${actual.length}`);
    }
  }

  return failures;
}

export function analyticsActivationFailures({
  clientEnabled = analyticsClientEnabled,
  writeEnabled = analyticsWriteEnabled,
  clientBuildVerified = analyticsClientBuildVerified,
  d1MigrationVerified = analyticsD1MigrationVerified,
  edgeRateLimitVerified = analyticsEdgeRateLimitVerified,
  privacyApproved = analyticsPrivacyApproved,
} = {}) {
  if (!clientEnabled && !writeEnabled) return [];
  const failures = [];
  if (!clientEnabled) failures.push("public launch blocked: analytics browser collection is not enabled");
  if (!writeEnabled) failures.push("public launch blocked: analytics server writes are not enabled");
  if (!clientBuildVerified) failures.push("public launch blocked: analytics client build is not verified");
  if (!d1MigrationVerified) failures.push("public launch blocked: analytics D1 migrations are not verified");
  if (!edgeRateLimitVerified) failures.push("public launch blocked: analytics edge rate limiting is not verified");
  if (!privacyApproved) failures.push("public launch blocked: analytics privacy disclosure is not approved");
  return failures;
}

export function publicLaunchGateFailures({
  indexingEnabled = publicIndexingEnabled,
  hostApproved = canonicalHostApproved,
  eligibleRoutes = EXPECTED_PUBLIC_SITEMAP_URLS,
  pendingManualApprovals = MANUAL_APPROVALS.pending,
  intakeReady = publicIntakeReady,
  siteKey = turnstileSiteKey,
  secretKey = turnstileSecretKey,
  allowedHostnames = turnstileAllowedHostnames,
  edgeRateLimitVerified = contactEdgeRateLimitVerified,
  leadWebhookUrl = webhookUrl,
  leadWebhookSecret = webhookSecret,
  leadMaintenanceSecret = maintenanceSecret,
  leadRateLimitSecret = rateLimitSecret,
} = {}) {
  const failures = [];
  if (!indexingEnabled) failures.push("public launch blocked: PUBLIC_INDEXING_ENABLED is not enabled");
  if (!hostApproved) failures.push("public launch blocked: canonical host is not approved");
  if (eligibleRoutes <= 0) failures.push("public launch blocked: no index-eligible routes");
  if (pendingManualApprovals > 0) {
    failures.push(`public launch blocked: ${pendingManualApprovals} manual approvals are pending`);
  }
  if (!intakeReady) failures.push("public launch blocked: PUBLIC_INTAKE_READY is not enabled");
  if (!siteKey) failures.push("public launch blocked: NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing");
  if (!secretKey) failures.push("public launch blocked: TURNSTILE_SECRET_KEY is missing");
  if (!validTurnstileAllowedHostnames(allowedHostnames)) {
    failures.push("public launch blocked: TURNSTILE_ALLOWED_HOSTNAMES is missing or invalid");
  }
  if (!edgeRateLimitVerified) failures.push("public launch blocked: contact edge rate limiting is not verified");
  if (!leadWebhookUrl) failures.push("public launch blocked: JUHAO_LEAD_WEBHOOK_URL is missing");
  if (!leadWebhookSecret) failures.push("public launch blocked: JUHAO_LEAD_WEBHOOK_SECRET is missing");
  if (!leadMaintenanceSecret) failures.push("public launch blocked: JUHAO_LEAD_MAINTENANCE_SECRET is missing");
  if (!leadRateLimitSecret) failures.push("public launch blocked: JUHAO_LEAD_RATE_LIMIT_SECRET is missing");
  else if (leadRateLimitSecret.length < 32) {
    failures.push("public launch blocked: JUHAO_LEAD_RATE_LIMIT_SECRET must be at least 32 characters");
  }
  failures.push(...analyticsActivationFailures());
  return failures;
}

function tagAttribute(html, selector, attribute) {
  const tags = html.match(selector) || [];
  for (const tag of tags) {
    const value = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
    if (value) return value;
  }
  return "";
}

function tagWithAttribute(html, selector, attribute, expected) {
  return (html.match(selector) || []).find((tag) =>
    tagAttribute(tag, selector, attribute).toLowerCase() === expected.toLowerCase(),
  ) || "";
}

function pageSeo(html) {
  const descriptionTag = tagWithAttribute(html, /<meta\b[^>]*>/gi, "name", "description");
  const canonicalTag = tagWithAttribute(html, /<link\b[^>]*>/gi, "rel", "canonical");
  const ogImageTag = tagWithAttribute(html, /<meta\b[^>]*>/gi, "property", "og:image");
  return {
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "",
    description: tagAttribute(descriptionTag, /<meta\b[^>]*>/gi, "content"),
    canonical: tagAttribute(canonicalTag, /<link\b[^>]*>/gi, "href"),
    ogImage: tagAttribute(ogImageTag, /<meta\b[^>]*>/gi, "content"),
    h1Count: (html.match(/<h1\b/gi) || []).length,
  };
}

async function request(url, options, label, failures) {
  try {
    return await fetch(url, options);
  } catch (error) {
    failures.push(`${label}: network failure (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

export async function main() {
  const launchGateFailures = [
    ...publicLaunchGateFailures(),
    ...fullCatalogReleaseFailures(),
  ];
  if (releaseGateOnly) {
    const report = {
      mode: "release-gate",
      ok: launchGateFailures.length === 0,
      indexingEnabled: publicIndexingEnabled,
      canonicalHostApproved,
      eligibleRoutes: EXPECTED_PUBLIC_SITEMAP_URLS,
      manualApprovals: MANUAL_APPROVALS,
      fullCatalog: {
        publicationState: publicCatalogRuntime.publication_state,
        catalogItemCount: publicCatalogItems.length,
        releaseEligible: fullCatalogReadiness.public_release_eligible === true,
        catalogBlockers: fullCatalogReadiness.blockers ?? [],
      },
      publicIntakeReady,
      intakeConfiguration: {
        siteKey: Boolean(turnstileSiteKey),
        secretKey: Boolean(turnstileSecretKey),
        allowedHostnames: turnstileAllowedHostnames,
        edgeRateLimitVerified: contactEdgeRateLimitVerified,
        webhookUrl: Boolean(webhookUrl),
        webhookSecret: Boolean(webhookSecret),
        maintenanceSecret: Boolean(maintenanceSecret),
        rateLimitSecret: Boolean(rateLimitSecret),
      },
      failures: launchGateFailures,
    };
    const output = JSON.stringify(report, null, 2);
    if (report.ok) console.log(output);
    else {
      console.error(output);
      process.exitCode = 1;
    }
    return report;
  }

  const failures = publicIndexingEnabled ? [...launchGateFailures] : [];
  const seenTitles = new Map();
  const seenDescriptions = new Map();
  const seenCanonicals = new Map();

  for (const record of publishedRecords) {
    const path = record.route;
    const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path, failures);
    if (!response) continue;
    const html = await response.text();
    if (response.status !== 200) failures.push(`${path}: expected 200, got ${response.status}`);
    if (/nvc-lighting|雷士|cnzz/i.test(html)) failures.push(`${path}: residual source brand or tracker`);
    failures.push(...indexingPolicyFailures({ html, path, shouldIndex: publicIndexingEnabled && record.index_eligible }));

    const seo = pageSeo(html);
    if (seo.h1Count !== 1) failures.push(`${path}: expected one H1, got ${seo.h1Count}`);
    if (!seo.title) failures.push(`${path}: title missing`);
    if (!seo.description) failures.push(`${path}: description missing`);
    if (!seo.canonical || new URL(seo.canonical, baseUrl).pathname !== record.canonical_slug) failures.push(`${path}: canonical mismatch (${seo.canonical})`);
    if (!seo.ogImage || !new URL(seo.ogImage, baseUrl).pathname.startsWith("/og/")) failures.push(`${path}: generated OG image missing`);
    for (const [label, value, map] of [["title", seo.title, seenTitles], ["description", seo.description, seenDescriptions], ["canonical", seo.canonical, seenCanonicals]]) {
      if (!value) continue;
      const prior = map.get(value);
      if (prior) failures.push(`${path}: duplicate ${label} with ${prior}`);
      else map.set(value, path);
    }
  }

  for (const path of spamPaths) {
    const response = await request(`${baseUrl}${path}`, { redirect: "manual", headers: siteHeaders }, path, failures);
    if (!response) continue;
    if (response.status !== 410) failures.push(`${path}: expected 410, got ${response.status}`);
    if (!/noindex/i.test(response.headers.get("x-robots-tag") || "")) failures.push(`${path}: x-robots-tag noindex missing`);
  }

  const login = await request(`${baseUrl}/login.html`, { redirect: "manual", headers: siteHeaders }, "/login.html", failures);
  if (login) {
    const location = login.headers.get("location") || "";
    if (![307, 308].includes(login.status) || new URL(location, baseUrl).pathname !== "/mall") {
      failures.push(`/login.html: expected internal mall status redirect, got ${login.status} ${location}`);
    }
  }

  const sitemap = await request(`${baseUrl}/sitemap.xml`, { headers: siteHeaders }, "/sitemap.xml", failures);
  const sitemapXml = sitemap ? await sitemap.text() : "";
  const sitemapRoutes = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  if (sitemap) {
    failures.push(...indexingPolicyFailures({
      sitemapStatus: sitemap.status,
      sitemapRoutes,
      expectedSitemapRoutes: publicIndexingEnabled ? expectedPublicSitemapRoutes : [],
    }));
  }

  if (checkMall) {
    for (const path of ["/", "/login.html"]) {
      const response = await request(`${mallBaseUrl}${path}`, { redirect: "manual" }, `mall${path}`, failures);
      if (response && (response.status < 200 || response.status >= 400)) failures.push(`mall${path}: expected 2xx/3xx, got ${response.status}`);
    }
  }

  if (failures.length) {
    console.error(JSON.stringify({ baseUrl, indexingMode: publicIndexingEnabled ? "public" : "private", ok: false, failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ baseUrl, mallBaseUrl, mallChecked: checkMall, indexingMode: publicIndexingEnabled ? "public" : "private", ok: true, checkedRoutes: expectedRoutes.length, seoEligible: EXPECTED_PUBLIC_SITEMAP_URLS, spam410: spamPaths.length, sitemapUrls: sitemapRoutes.length }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
