import { Outlet, Link, createRootRoute, useRouterState, useNavigate } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useState, useEffect, ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AdminStoreProvider } from "@/lib/admin-store";
import { setUnauthorizedHandler, apiFetch, apiBase } from "@/lib/api";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AdminPageLoader } from "@/components/common/PageLoader";
import "../styles.css";

import { LottiePlayer } from "@/components/common/LottiePlayer";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <LottiePlayer
          src="/404_pagenotfound.json"
          loop
          className="mx-auto h-36 w-36 sm:h-48 sm:w-48 lg:h-56 lg:w-56 mb-4"
        />
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function GlobalErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-background text-foreground">
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 max-w-md w-full">
        <h2 className="mb-2 text-xl font-bold text-destructive">Something went wrong</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

import { requireAdminAuth } from "@/lib/requireAuth";

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/login") return;
    requireAdminAuth(location.pathname + location.searchStr);
  },
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: GlobalErrorComponent,
});

function RootComponent() {
  useEffect(() => {
    let toastId: string | number | null = null;
    const timer = setTimeout(() => {
      toastId = toast.info("Server is warming up...", {
        description: "Please allow up to 30 seconds for the first request to complete.",
        duration: 30000,
      });
    }, 2000);

    apiFetch(`${apiBase()}/health`)
      .then(() => {
        clearTimeout(timer);
        if (toastId) toast.dismiss(toastId);
      })
      .catch(() => clearTimeout(timer));
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <AdminStoreProvider>
        <AppShell />
        <Toaster richColors position="top-right" />
      </AdminStoreProvider>
    </AuthProvider>
  );
}

import { useSSE } from "@/hooks/useSSE";

function AppShell() {
  const { isAuthenticated, isReady } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isLoginRoute = pathname === "/login";

  useSSE(isReady && isAuthenticated && !isLoginRoute);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!isLoginRoute) {
        navigate({ to: "/login" });
      }
    });
  }, [navigate, isLoginRoute]);

  useEffect(() => {
    if (isReady && !isAuthenticated && !isLoginRoute) {
      navigate({ to: "/login" });
    }
  }, [isReady, isAuthenticated, isLoginRoute, navigate]);

  if (!isReady) {
    return <AdminPageLoader />;
  }

  if (isLoginRoute) {
    return <Outlet />;
  }

  if (!isAuthenticated) {
    return <AdminPageLoader />;
  }

  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="hidden lg:block w-60 shrink-0" />
      <div className="flex-1 min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
