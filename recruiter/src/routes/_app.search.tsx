import { createFileRoute } from "@tanstack/react-router";
import { SearchCandidatesPage } from "@/features/search/SearchCandidatesPage";
import { loadRecruiterDashboard } from "@/lib/recruiterData";
import { PageLoader } from "@/components/common/PageLoader";

export const Route = createFileRoute("/_app/search")({
  staleTime: 0,
  loader: () => loadRecruiterDashboard(1, 50),
  pendingComponent: PageLoader,
  head: () => ({
    meta: [
      { title: "Search Candidates — ApronHanger" },
      {
        name: "description",
        content: "Search verified healthcare candidates across India.",
      },
    ],
  }),
  component: SearchCandidatesPage,
});
