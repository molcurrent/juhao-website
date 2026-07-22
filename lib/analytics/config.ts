export type AnalyticsRuntimeConfig = {
  NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED?: string;
  PRIVACY_ANALYTICS_WRITE_ENABLED?: string;
  ANALYTICS_D1_MIGRATION_VERIFIED?: string;
  ANALYTICS_CLIENT_BUILD_VERIFIED?: string;
  ANALYTICS_EDGE_RATE_LIMIT_VERIFIED?: string;
  ANALYTICS_PRIVACY_APPROVED?: string;
};

export function analyticsSettingEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function analyticsWriteReady(runtime: AnalyticsRuntimeConfig) {
  return analyticsSettingEnabled(runtime.NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED)
    && analyticsSettingEnabled(runtime.PRIVACY_ANALYTICS_WRITE_ENABLED)
    && analyticsSettingEnabled(runtime.ANALYTICS_D1_MIGRATION_VERIFIED)
    && analyticsSettingEnabled(runtime.ANALYTICS_CLIENT_BUILD_VERIFIED)
    && analyticsSettingEnabled(runtime.ANALYTICS_EDGE_RATE_LIMIT_VERIFIED)
    && analyticsSettingEnabled(runtime.ANALYTICS_PRIVACY_APPROVED);
}
