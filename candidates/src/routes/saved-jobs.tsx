import { apiBase } from "@/lib/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { EmptyState } from "@/components/common/EmptyState";
import { authHeader } from "@/store/authStore";
import { requireCandidateAuth } from "@/lib/requireAuth";
import { setSavedIds } from "@/store/savedJobsStore";
import type { Job } from "@/data/jobs";
import { PageLoader } from "@/components/common/PageLoader";

export const Route = createFileRoute("/saved-jobs")({
  beforeLoad: () => requireCandidateAuth("/saved-jobs"),
  head: () => ({
    meta: [{ title: "Saved Jobs — ApronHanger" }],
  }),
  component: SavedJobsPage,
} as any);

async function loadSavedJobsData(): Promise<{ jobs: Job[]; jobIds: string[] }> {
  const res = await fetch(`${apiBase()}/api/saved-jobs`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to load saved jobs");
  // Backend returns: [{savedAt, job}[]]
  const data = (await res.json()) as { savedAt: string; job: Job }[];
  const jobs = (data ?? []).map((item) => item.job).filter(Boolean) as Job[];
  const jobIds = jobs.map((j) => j.id);
  return { jobs, jobIds };
}

function SavedJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadSavedJobsData()
      .then(({ jobs: fetchedJobs, jobIds }) => {
        if (!cancelled) {
          setJobs(fetchedJobs);
          // Keep the bookmark-icon store in sync
          setSavedIds(jobIds);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Saved jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {jobs.length} role{jobs.length !== 1 ? "s" : ""} bookmarked for later
          </p>
        </div>
        <Link
          to="/"
          search={{ q: "", city: "" }}
          className="text-sm font-medium text-primary hover:underline"
        >
          Browse opportunities →
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Bookmark}
            lottieFile="nothing_for_the_particular_query.json"
            title="No saved jobs yet"
            description="Tap the bookmark icon on any job to save it here."
            ctaLabel="Find opportunities"
            ctaTo="/"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  );
}
