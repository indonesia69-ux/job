import { createFileRoute } from "@tanstack/react-router";
import { ApplicantsPage } from "@/features/applicants/ApplicantsPage";
import { loadRecruiterDashboard } from "@/lib/recruiterData";
import { PageLoader } from "@/components/common/PageLoader";

export const Route = createFileRoute("/_app/applicants")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { jobId?: string; q?: string; page?: number; limit?: number } => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    page: typeof search.page === "number" ? search.page : 1,
    limit: typeof search.limit === "number" ? search.limit : 50,
  }),
  staleTime: 0,
  loaderDeps: ({ search: { page, limit } }) => ({ page, limit }),
  loader: async ({ deps: { page, limit } }) => await loadRecruiterDashboard(page, limit),
  pendingComponent: PageLoader,
  head: () => ({
    meta: [
      { title: "Applicants — ApronHanger" },
      { name: "description", content: "Review applicants for your job postings." },
    ],
  }),
  component: ApplicantsPage,
});
