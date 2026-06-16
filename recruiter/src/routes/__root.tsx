import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { isAuthenticated } from "@/store/authStore";
import { useEffect } from "react";
import { apiBase } from "@/lib/api";
import { toast, Toaster } from "sonner";

import appCss from "../styles.css?url";

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ApronHanger — Recruiter Dashboard" },
      {
        name: "description",
        content:
          "ApronHanger Recruiter Dashboard — post healthcare jobs and manage clinician applicants.",
      },
      { name: "author", content: "ApronHanger" },
      { property: "og:title", content: "ApronHanger — Recruiter Dashboard" },
      {
        property: "og:description",
        content: "Premium hiring platform for hospitals and clinics in India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preload", as: "fetch", href: "/loading_state.json", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  beforeLoad: ({ location }) => {
    // Skip on SSR — localStorage is only available in the browser
    if (typeof window === "undefined") return;
    const onAuthPage = location.pathname.startsWith("/auth");
    if (!onAuthPage && !isAuthenticated()) {
      throw redirect({ to: "/auth/login" });
    }
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: GlobalErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useSSE } from "@/hooks/useSSE";

function RootComponent() {
  useSSE(); // Enable real-time SSE notifications

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

  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );
}
