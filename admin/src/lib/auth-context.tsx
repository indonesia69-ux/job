import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiBase, apiFetch } from "./api";

const STORAGE_KEY = "apronhanger.admin.session";

interface AdminUser {
  email: string;
  name: string;
  initials: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setIsReady(true);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiFetch(`${apiBase()}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
    const u = data.user as AdminUser;
    // Add initials if backend doesn't provide them
    if (!u.initials) {
      u.initials = u.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const session = { ...u, token: data.token };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const DEMO_CREDENTIALS = { email: "admin@apronhanger.in", password: "admin123" };
