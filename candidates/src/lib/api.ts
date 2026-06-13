/**
 * Returns the API base URL.
 * Production cPanel builds must set VITE_API_BASE to the Render backend URL.
 * Development may fall back to the local Vite proxy in the browser.
 */
export function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE || "";
  if (import.meta.env.PROD && !configured) {
    throw new Error("VITE_API_BASE is required for production builds.");
  }
  if (typeof window === "undefined") {
    return configured || "http://127.0.0.1:3000";
  }
  return configured;
}
