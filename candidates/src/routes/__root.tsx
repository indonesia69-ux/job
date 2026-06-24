import { Outlet, createRootRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { hydrateProfileFromApi } from "@/lib/hydrate";
import { hydrateSavedJobIds } from "@/store/savedJobsStore";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { isAuthenticated } from "@/store/authStore";
import { apiBase, setUnauthorizedHandler } from "@/lib/api";
import { toast } from "sonner";

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
            search={{ q: "", city: "" }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to opportunities
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

export const Route = createRootRoute({
  // Candidates may browse jobs without signing in; protected routes use requireCandidateAuth.
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: GlobalErrorComponent,
});

import { useSSE } from "@/hooks/useSSE";

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isFullBleed = pathname.startsWith("/auth");

  useSSE(); // Enable real-time SSE notifications

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!pathname.startsWith("/auth")) {
        navigate({ to: "/auth", search: { redirect: pathname } });
      }
    });
  }, [navigate, pathname]);

  useEffect(() => {
    if (isAuthenticated()) {
      void hydrateProfileFromApi();
      void hydrateSavedJobIds();
    }
  }, []);

  useEffect(() => {
    let toastId: string | number | null = null;
    const timer = setTimeout(() => {
      toastId = toast.info("Server is warming up...", {
        description: "Please allow up to 30 seconds for the first request to complete.",
        duration: 30000,
      });
    }, 2000);

    fetch(`${apiBase()}/health`)
      .then(() => {
        clearTimeout(timer);
        if (toastId) toast.dismiss(toastId);
      })
      .catch(() => clearTimeout(timer));
    return () => clearTimeout(timer);
  }, []);

  if (isFullBleed) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" />
    </div>
  );
}
