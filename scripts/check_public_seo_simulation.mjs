import { pathToFileURL } from "node:url";
import { publicLaunchGateFailures } from "./check_launch_health.mjs";
import { auditSeoRoutes } from "./seo_route_acceptance.mjs";

function enabled(value) {
  return ["1", "true"].includes((value ?? "false").toLowerCase());
}

export async function main() {
  const indexingEnabled = enabled(process.env.PUBLIC_INDEXING_ENABLED);
  const canonicalHostApproved = enabled(process.env.CANONICAL_HOST_APPROVED);
  const failures = [];

  if (!indexingEnabled) failures.push("PUBLIC_INDEXING_ENABLED must be true for the public SEO simulation");

  const audit = await auditSeoRoutes({ mode: "public" });
  failures.push(...audit.failures);

  const launchGate = publicLaunchGateFailures({
    indexingEnabled,
    hostApproved: canonicalHostApproved,
    eligibleRoutes: audit.index_eligible_routes,
  });
  if (!canonicalHostApproved && !launchGate.some((failure) => failure.includes("canonical host is not approved"))) {
    failures.push("public launch must remain blocked while CANONICAL_HOST_APPROVED=false");
  }
  if (canonicalHostApproved) failures.push(...launchGate);

  const report = {
    ...audit,
    passed: failures.length === 0,
    canonical_host_approved: canonicalHostApproved,
    public_launch_blocked: launchGate.length > 0,
    launch_gate_failures: launchGate,
    failures,
  };

  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return report;
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
