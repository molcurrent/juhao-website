"use client";

import type { ClientAnalyticsEvent } from "./events";

const analyticsEnabled = process.env.NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED?.trim().toLowerCase() === "true";

type PrivacyNavigator = Navigator & {
  globalPrivacyControl?: boolean;
  msDoNotTrack?: string;
};

function privacySignalEnabled() {
  const browser = navigator as PrivacyNavigator;
  return browser.globalPrivacyControl === true
    || browser.doNotTrack === "1"
    || browser.msDoNotTrack === "1";
}

export function recordAnalyticsEvent(event: ClientAnalyticsEvent) {
  if (!analyticsEnabled || privacySignalEnabled()) return false;
  const body = JSON.stringify(event);
  if (navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }))) return true;
  void fetch("/api/analytics", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
  return true;
}
