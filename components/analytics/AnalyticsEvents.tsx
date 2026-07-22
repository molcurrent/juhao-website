"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { recordAnalyticsEvent } from "@/lib/analytics/client";
import type { ClientAnalyticsEvent } from "@/lib/analytics/events";

export function AnalyticsView({ event }: { event: ClientAnalyticsEvent }) {
  const eventKey = JSON.stringify(event);
  const lastEventKey = useRef("");
  useEffect(() => {
    if (lastEventKey.current === eventKey) return;
    lastEventKey.current = eventKey;
    recordAnalyticsEvent(event);
  }, [event, eventKey]);
  return null;
}

export function CaseDepthAnalytics({ contentId }: { contentId: string }) {
  useEffect(() => {
    const reached = new Set<string>();
    const checkDepth = () => {
      const root = document.documentElement;
      const scrollable = root.scrollHeight - window.innerHeight;
      const progress = scrollable <= 0 ? 1 : window.scrollY / scrollable;
      for (const threshold of [50, 90] as const) {
        if (progress < threshold / 100 || reached.has(String(threshold))) continue;
        reached.add(String(threshold));
        recordAnalyticsEvent({ name: "case_depth_reached", contentId, depth: String(threshold) as "50" | "90" });
      }
    };
    checkDepth();
    window.addEventListener("scroll", checkDepth, { passive: true });
    window.addEventListener("resize", checkDepth);
    return () => {
      window.removeEventListener("scroll", checkDepth);
      window.removeEventListener("resize", checkDepth);
    };
  }, [contentId]);
  return null;
}

type AnalyticsLinkProps = ComponentProps<typeof Link> & {
  analyticsEvent: ClientAnalyticsEvent;
};

export function AnalyticsLink({ analyticsEvent, onClick, ...props }: AnalyticsLinkProps) {
  return <Link
    {...props}
    onClick={(event) => {
      recordAnalyticsEvent(analyticsEvent);
      onClick?.(event);
    }}
  />;
}
