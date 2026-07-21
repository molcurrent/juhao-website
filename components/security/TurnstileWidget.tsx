"use client";

import { useEffect, useRef } from "react";
import { CONSULTATION_TURNSTILE_ACTION } from "@/lib/consultation";

type TurnstileApi = {
  render(container: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback(token: string): void;
    "expired-callback"(): void;
    "error-callback"(): void;
  }): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "juhao-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export type TurnstileWidgetProps = {
  siteKey: string;
  resetKey: number;
  onTokenChange(token: string): void;
};

export function TurnstileWidget({ siteKey, resetKey, onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: CONSULTATION_TURNSTILE_ACTION,
        callback: onTokenChange,
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) renderWidget();
      else existing.addEventListener("load", renderWidget, { once: true });
    } else {
      const script = document.createElement("script");
      const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      if (nonce) script.nonce = nonce;
      script.addEventListener("load", renderWidget, { once: true });
      document.head.appendChild(script);
    }

    if (!window.turnstile) retryTimer = window.setTimeout(renderWidget, 1_000);

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      const existingScript = document.getElementById(SCRIPT_ID);
      existingScript?.removeEventListener("load", renderWidget);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [onTokenChange, siteKey]);

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenChange("");
    }
  }, [onTokenChange, resetKey]);

  return <div ref={containerRef} />;
}
