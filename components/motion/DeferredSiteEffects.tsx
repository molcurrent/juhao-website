"use client";

import { lazy, Suspense } from "react";

const SiteEffects = lazy(() => import("./SiteEffects"));

export function DeferredSiteEffects() {
  return <Suspense fallback={null}><SiteEffects /></Suspense>;
}
