declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    PUBLIC_INTAKE_READY?: string;
    TURNSTILE_SECRET_KEY?: string;
    JUHAO_LEAD_WEBHOOK_URL?: string;
    JUHAO_LEAD_WEBHOOK_SECRET?: string;
    JUHAO_LEAD_MAINTENANCE_SECRET?: string;
  }
}
