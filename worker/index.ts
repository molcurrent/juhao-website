/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import rawLegacyNewsRoutes from "../content/runtime/legacy-news-routes.json";
import { runConsultationMaintenance } from "../lib/server/consultation-maintenance";

interface Env {
  ASSETS?: Fetcher;
  DB?: D1Database;
  PUBLIC_INDEXING_ENABLED?: string;
  JUHAO_LEAD_WEBHOOK_URL?: string;
  JUHAO_LEAD_WEBHOOK_SECRET?: string;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type LegacyNewsRoute = {
  action: "redirect" | "not_found" | "gone";
  status_code: 308 | 404 | 410;
  destination: string;
  legacy_paths: string[];
};

const legacyNewsByPath = new Map(
  (rawLegacyNewsRoutes as LegacyNewsRoute[]).flatMap((record) =>
    record.legacy_paths.map((path) => [path, record] as const),
  ),
);

const correctedProductRoutes = new Map([
  ["/products/project-custom/12265", "/products/spotlights/12265"],
  ["/products/project-custom/12266", "/products/spotlights/12266"],
  ["/products/project-custom/12267", "/products/spotlights/12267"],
]);

function isLocalCatalogPreview(url: URL) {
  return ["127.0.0.1", "localhost", "::1", "[::1]"].includes(
    url.hostname,
  );
}

function isLocalDevelopmentRequest(url: URL) {
  return url.protocol === "http:" && isLocalCatalogPreview(url);
}

function contentSecurityPolicy({ nonce, secureRequest, hmrHost }: { nonce?: string; secureRequest: boolean; hmrHost?: string }) {
  const scriptSources = secureRequest
    ? ["'self'", ...(nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : []), "https://challenges.cloudflare.com"]
    : ["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com"];
  const connectSources = [
    "'self'",
    "https://challenges.cloudflare.com",
    ...(hmrHost ? [`ws://${hmrHost}`] : []),
  ];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    `worker-src 'self'${hmrHost ? " blob:" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    ...(secureRequest ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function securityPolicyForRequest(request: Request, nonce?: string) {
  const url = new URL(request.url);
  return contentSecurityPolicy({
    nonce,
    secureRequest: url.protocol === "https:",
    hmrHost: isLocalDevelopmentRequest(url) ? url.host : undefined,
  });
}

function withSecurityHeaders(
  request: Request,
  response: Response,
  policy = securityPolicyForRequest(request),
  forceNoindex = false,
) {
  const secured = new Response(response.body, response);
  const secureRequest = new URL(request.url).protocol === "https:";
  secured.headers.set("Content-Security-Policy", policy);
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  if (forceNoindex) {
    secured.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  if (secureRequest) {
    secured.headers.set("Strict-Transport-Security", "max-age=86400");
  }
  return secured;
}

function indexingEnabled(env: Env) {
  return ["1", "true"].includes(env.PUBLIC_INDEXING_ENABLED?.trim().toLowerCase() ?? "false");
}

function robotsBody(publicIndexing: boolean) {
  return publicIndexing
    ? "User-agent: *\nAllow: /\n\nSitemap: https://juhao.com/sitemap.xml\nHost: https://juhao.com\n"
    : "User-agent: *\nDisallow: /\n";
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const secureRequest = url.protocol === "https:";
    const nonce = secureRequest ? crypto.randomUUID().replaceAll("-", "") : undefined;
    const policy = securityPolicyForRequest(request, nonce);
    const publicIndexing = indexingEnabled(env);
    const secure = (response: Response, responsePolicy = policy) =>
      withSecurityHeaders(request, response, responsePolicy, !publicIndexing);
    let appRequest = request;
    if (nonce) {
      const headers = new Headers(request.headers);
      headers.set("Content-Security-Policy", policy);
      headers.set("x-nonce", nonce);
      appRequest = new Request(request, { headers });
    }
    const confirmedSpamPaths = new Set([
      "/static/news/9062.html",
      "/static/news/1689.html",
      "/static/news/1022.html",
      "/static/news/3649.html",
      "/static/news/5795.html",
      "/static/news/8058.html",
    ]);

    if (url.pathname === "/robots.txt") {
      return secure(new Response(robotsBody(publicIndexing), {
        headers: {
          "cache-control": "public, max-age=300",
          "content-type": "text/plain; charset=utf-8",
        },
      }));
    }

    if (
      (url.pathname === "/catalog-lab" ||
        url.pathname.startsWith("/catalog-lab/")) &&
      !isLocalCatalogPreview(url)
    ) {
      return secure(
        new Response("Not Found", {
          status: 404,
          headers: {
            "cache-control": "no-store",
            "content-type": "text/plain; charset=utf-8",
            "x-robots-tag": "noindex, nofollow, noarchive",
          },
        }),
      );
    }

    if (confirmedSpamPaths.has(url.pathname)) {
      return secure(new Response("Gone", { status: 410, headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" } }));
    }

    const correctedProductRoute = correctedProductRoutes.get(url.pathname);
    if (correctedProductRoute) {
      return secure(Response.redirect(new URL(correctedProductRoute, request.url), 308));
    }

    const legacyNews = legacyNewsByPath.get(url.pathname);
    if (legacyNews?.action === "redirect") {
      return secure(Response.redirect(new URL(legacyNews.destination, request.url), 308));
    }
    if (legacyNews) {
      const status = legacyNews.action === "gone" ? 410 : 404;
      return secure(new Response(status === 410 ? "Gone" : "Not Found", {
        status,
        headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
      }));
    }

    if (url.pathname === "/_vinext/image") {
      const assets = env.ASSETS;
      const images = env.IMAGES;
      if (!assets || !images) {
        const source = url.searchParams.get("url");
        if (source?.startsWith("/") && !source.startsWith("//") && !source.includes("\\")) {
          return secure(Response.redirect(new URL(source, request.url), 307));
        }
        return secure(new Response("Image optimization is unavailable", { status: 503 }));
      }
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return secure(await handleImageOptimization(request, {
        fetchAsset: (path) => assets.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await images.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths));
    }

    return secure(await handler.fetch(appRequest, env, ctx));
  },
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runConsultationMaintenance(env).then(() => undefined));
  },
};

export default worker;
