import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { PageLoader } from "@/components/common/PageLoader";

import { PlanProvider, usePlan } from "@/features/search/PlanContext";
import { AlertCircle } from "lucide-react";

/** Auth + API need the browser; SSR loaders would run without a token and show empty data. */
export const Route = createFileRoute("/_app")({
  ssr: false,
  pendingComponent: PageLoader,
  component: AppLayout,
});

function SuspensionBanner() {
  const { isPlanSuspended } = usePlan();

  if (!isPlanSuspended) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-start sm:items-center gap-3">
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5 sm:mt-0" />
      <div className="text-sm text-destructive">
        <span className="font-semibold">Account Suspended:</span> Your account is currently
        suspended due to a plan downgrade. You have read-only access.
      </div>
    </div>
  );
}

function AppLayout() {
  return (
    <PlanProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />

          <SidebarInset className="flex min-h-screen flex-1 flex-col">
            <TopBar />
            <SuspensionBanner />

            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
              <Outlet />
            </main>

            <Footer />
          </SidebarInset>
        </div>

        <Toaster position="top-right" />
      </SidebarProvider>
    </PlanProvider>
  );
}
