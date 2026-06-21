import { apiBase, apiFetch } from "@/lib/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Briefcase, Building2, Calendar, ChevronRight, Inbox } from "lucide-react";
import { type ApplicationStatus } from "@/data/applications";
import {
  apiToDisplayStatus,
  statusPillClass,
  CANDIDATE_STATUS_STEPS,
  timelineStepIndex,
} from "@/lib/applicationStatus";
import { CandidateActionCard } from "@/features/applications/CandidateActionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { authHeader } from "@/store/authStore";
import { requireCandidateAuth } from "@/lib/requireAuth";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/common/PageLoader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/applications")({
  beforeLoad: () => requireCandidateAuth("/applications"),
  head: () => ({
    meta: [
      { title: "My Applications — ApronHanger" },
      { name: "description", content: "Track the status of your healthcare job applications." },
    ],
  }),
  component: ApplicationsPage,
} as any);

type AppRow = {
  id: string;
  jobId: string;
  role: string;
  hospital: string;
  city: string;
  appliedOn: string;
  status: ApplicationStatus;
  apiStatus: string;
  lastUpdate: string;

  // New workflow fields
  interviewDate?: string | null;
  interviewType?: string | null;
  meetingLink?: string | null;
  venue?: string | null;
  interviewerName?: string | null;
  offerLetterUrl?: string | null;
  requestedDocumentList?: string[];
  documentRequestNote?: string | null;
  joiningDate?: string | null;
};

function mapStatus(api: string): ApplicationStatus {
  return apiToDisplayStatus(api) as ApplicationStatus;
}

function mapApplication(app: {
  id: string;
  status: string;
  appliedOn: string;
  jobId: string;
  job: { role: string; hospital: string; city?: string | null; location?: string };
  interviewDate?: string | null;
  interviewType?: string | null;
  meetingLink?: string | null;
  venue?: string | null;
  interviewerName?: string | null;
  offerLetterUrl?: string | null;
  requestedDocumentList?: string[];
  documentRequestNote?: string | null;
  joiningDate?: string | null;
}): AppRow & { appliedAt: string } {
  return {
    id: app.id,
    jobId: app.jobId,
    role: app.job.role,
    hospital: app.job.hospital,
    city: app.job.city || app.job.location || "",
    appliedOn: new Date(app.appliedOn).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    appliedAt: app.appliedOn,
    status: mapStatus(app.status),
    apiStatus: app.status,
    lastUpdate:
      app.status === "JobClosed"
        ? "This job posting has been closed by the recruiter"
        : app.status === "New" || app.status === "Applied"
          ? "Application received by hospital"
          : `Status updated to ${mapStatus(app.status)}`,
    interviewDate: app.interviewDate,
    interviewType: app.interviewType,
    meetingLink: app.meetingLink,
    venue: app.venue,
    interviewerName: app.interviewerName,
    offerLetterUrl: app.offerLetterUrl,
    requestedDocumentList: app.requestedDocumentList,
    documentRequestNote: app.documentRequestNote,
    joiningDate: app.joiningDate,
  };
}

function sortApplications<T extends { appliedAt: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );
}

const TABS = [
  "All",
  "Applied",
  "Reviewed",
  "Interview Scheduled",
  "Shortlisted",
  "Documents Requested",
  "Offer Sent",
  "Rejected",
  "Joined",
] as const;

type TabValue = (typeof TABS)[number];

async function loadApplicationsData(): Promise<AppRow[]> {
  const res = await apiFetch(`${apiBase()}/api/applications`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to load applications");
  const data = await res.json();
  return sortApplications(data.map(mapApplication)) as unknown as AppRow[];
}

function ApplicationsPage() {
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<TabValue>("All");

  const loadApps = () => {
    setLoading(true);
    setFetchError(null);
    loadApplicationsData()
      .then((rows) => {
        setApplications(rows);
        setFetchedAt(new Date());
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : "Could not load applications.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadApps();
  }, []);

  if (loading) return <PageLoader />;

  if (fetchError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="text-sm text-destructive">{fetchError}</p>
        <Button className="mt-4" onClick={loadApps}>
          Try again
        </Button>
      </div>
    );
  }

  const list = tab === "All" ? applications : applications.filter((a: AppRow) => a.status === tab);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {applications.length} application{applications.length !== 1 ? "s" : ""}
            {fetchedAt &&
              ` · fetched at ${fetchedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
      </div>

      <div className="scrollbar-thin mt-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => {
          const count =
            t === "All"
              ? applications.length
              : applications.filter((a: AppRow) => a.status === t).length;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}{" "}
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-[10px]",
                  active ? "bg-brand-soft text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Inbox}
            lottieFile="nothing_for_the_particular_query.json"
            title="No applications yet"
            description="Start applying to opportunities and track your progress here."
            ctaLabel="Browse opportunities"
            ctaTo="/"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((a: AppRow) => (
            <div
              key={a.id}
              className="group block rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary">
                    <Building2 className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: a.jobId }}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {a.role}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.hospital} · {a.city}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Applied {a.appliedOn}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={a.status} />
                  <Link to="/jobs/$jobId" params={{ jobId: a.jobId }}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform hover:text-primary" />
                  </Link>
                </div>
              </div>

              <div className="mt-5">
                <Timeline status={a.status} apiStatus={a.apiStatus} />
                <p className="mt-3 text-xs text-muted-foreground">
                  <Briefcase className="mr-1 inline h-3 w-3" />
                  {a.lastUpdate}
                </p>
              </div>

              <CandidateActionCard application={a} onUpdate={loadApps} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        statusPillClass(status),
      )}
    >
      {status}
    </span>
  );
}

function Timeline({ status, apiStatus }: { status: ApplicationStatus; apiStatus: string }) {
  if (status === "Job closed") {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        This job posting has been closed. You are no longer in the active pipeline for this role.
      </div>
    );
  }
  if (status === "Rejected") {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        Application closed by recruiter
      </div>
    );
  }

  const currentIndex = timelineStepIndex(apiStatus);
  return (
    <div className="flex items-center gap-1">
      {CANDIDATE_STATUS_STEPS.map((s, i) => {
        const done = i <= currentIndex;
        return (
          <div key={s} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                done
                  ? s === "Offer & Joining"
                    ? "bg-emerald-600 text-white"
                    : s === "Documents"
                      ? "bg-amber-600 text-white"
                      : "bg-brand text-brand-foreground"
                  : "border bg-surface text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            <div className="hidden md:block">
              <p
                className={cn(
                  "text-[10px] font-medium",
                  done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s}
              </p>
            </div>
            {i < CANDIDATE_STATUS_STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i < currentIndex ? "bg-brand" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
