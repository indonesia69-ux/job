import { redirect } from "@tanstack/react-router";

/** Redirect guests to sign-in; optional return path after login. */
export function requireAdminAuth(returnPath?: string) {
  if (typeof window === "undefined") return;
  
  const raw = window.localStorage.getItem("apronhanger.admin.session");
  let isAuthenticated = false;
  if (raw) {
    try {
      const session = JSON.parse(raw);
      if (session && session.token) isAuthenticated = true;
    } catch {
      // Ignore parse errors
    }
  }

  if (isAuthenticated) return;

  const redirectTo = returnPath ?? `${window.location.pathname}${window.location.search}`;
  throw redirect({
    to: "/login",
    search: { redirect: redirectTo },
  });
}
