import * as Sentry from "@sentry/react";

let enabled = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
  });
  enabled = true;
}

export function captureException(error: unknown): void {
  if (!enabled) return;
  Sentry.captureException(error);
}

export function isSentryEnabled(): boolean {
  return enabled;
}
