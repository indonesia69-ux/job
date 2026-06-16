// Get the base URL for the API.
export function apiBase() {
  const configured = import.meta.env.VITE_API_BASE || "";
  if (import.meta.env.PROD && !configured) {
    throw new Error("VITE_API_BASE is required for production builds.");
  }
  if (typeof window !== "undefined") {
    return configured;
  }
  return configured || "http://127.0.0.1:3000";
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

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    if (typeof input === 'string' && !input.includes('/auth/login')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("apronhanger.admin.session");
        if (window.location.pathname !== '/auth') {
          window.location.href = "/auth";
        }
      }
    }
  }
  return res;
}
