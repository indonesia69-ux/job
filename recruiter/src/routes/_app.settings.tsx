import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { loadHospitalProfile } from "@/lib/recruiterData";
import { authHeader } from "@/store/authStore";
import { apiBase } from "@/lib/api";
import { PageLoader } from "@/components/common/PageLoader";

export const Route = createFileRoute("/_app/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  staleTime: 0,
  loader: async () => {
    const [hospital, userRes] = await Promise.all([
      loadHospitalProfile(),
      fetch(`${apiBase()}/api/auth/me`, { headers: authHeader() }),
    ]);
    const userJson = userRes.ok ? await userRes.json().catch(() => null) : null;
    return { hospital, userPrefs: userJson?.user };
  },
  pendingComponent: PageLoader,
  head: () => ({
    meta: [
      { title: "Hospital Profile & Settings — ApronHanger" },
      { name: "description", content: "Manage your hospital's profile and verification status." },
    ],
  }),
  component: SettingsPage,
});
