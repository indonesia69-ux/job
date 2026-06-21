import { createFileRoute } from "@tanstack/react-router";
import { EditJobPage } from "@/features/jobs/EditJobPage";
import { loadJob } from "@/lib/recruiterData";
import { PageLoader } from "@/components/common/PageLoader";

export const Route = createFileRoute("/_app/jobs/$jobId/edit")({
  loader: ({ params }) => loadJob(params.jobId).then((job) => ({ job })),
  staleTime: 0,
  pendingComponent: PageLoader,
  head: () => ({
    meta: [
      { title: "Edit Job - ApronHanger" },
      { name: "description", content: "Edit a posted healthcare opportunity." },
    ],
  }),
  component: EditJobPage,
});
