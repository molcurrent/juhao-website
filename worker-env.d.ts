declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    PUBLIC_INDEXING_ENABLED?: string;
    PUBLIC_INTAKE_READY?: string;
    NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    TURNSTILE_ALLOWED_HOSTNAMES?: string;
    CONTACT_EDGE_RATE_LIMIT_VERIFIED?: string;
    JUHAO_LEAD_RATE_LIMIT_SECRET?: string;
    JUHAO_LEAD_WEBHOOK_URL?: string;
    JUHAO_LEAD_WEBHOOK_SECRET?: string;
    JUHAO_LEAD_MAINTENANCE_SECRET?: string;
  }
}
