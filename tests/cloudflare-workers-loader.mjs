const TEST_URL = "cloudflare-workers:test";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") return { url: TEST_URL, shortCircuit: true };
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url === TEST_URL) {
    return {
      format: "module",
      source: "export const env = globalThis.__cloudflareTestEnv;",
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
