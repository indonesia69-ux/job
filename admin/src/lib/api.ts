// Get the base URL for the API
export function apiBase() {
  if (typeof window !== "undefined") {
    // If in the browser, allow falling back to a relative path or explicit env var
    return import.meta.env.VITE_API_BASE || "";
  }
  // During SSR (Node.js server): must be an absolute URL
  return import.meta.env.VITE_API_BASE || "http://127.0.0.1:3000";
}

export function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("apronhanger.admin.session");
    if (!raw) return {};
    const session = JSON.parse(raw);
    if (!session.token) return {};
    return { Authorization: `Bearer ${session.token}` };
  } catch {
    return {};
  }
}
