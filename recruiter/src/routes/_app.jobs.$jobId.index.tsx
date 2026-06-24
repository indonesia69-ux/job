import { apiBase, apiFetch } from "@/lib/api";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  IndianRupee,
  MapPin,
  Briefcase,
  CheckCircle2,
  Edit3,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/brand/VerifiedBadge";
import { loadJob } from "@/lib/recruiterData";
import { PageLoader } from "@/components/common/PageLoader";
import { sanitizeJobDescriptionHtml } from "@/lib/sanitizeHtml";

function formatLPA(min: number, max: number) {
  if (min === 0 && max === 0) return "Unpaid / Stipend";
  if (min === max) return `₹${min} LPA`;
  return `₹${min}–${max} LPA`;
}

function formatExp(min: number, max: number) {
  if (min === max) return `${min} yr`;
  return `${min}–${max} yrs`;
}

function isHtmlContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export const Route = createFileRoute("/_app/jobs/$jobId/")({
  loader: ({ params }) => loadJob(params.jobId).then((job) => ({ job })),
  staleTime: 0,
  pendingComponent: PageLoader,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.job.role} - ApronHanger` },
          { name: "description", content: (loaderData.job.description ?? "").slice(0, 150) },
        ]
      : [],
  }),
  component: JobDetails,
});

function JobDetails() {
  const { job } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to posted jobs
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Header card */}
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {job.role}
                  </h1>
                  {job.hospitalVerified && <VerifiedBadge label="Verified Hospital" />}
                </div>
                <p className="mt-1 text-sm text-foreground/80">
                  {job.hospital} · {job.specialty}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {job.type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Posted {job.postedOn || "recently"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {job.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {job.tags.map((t: string) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {job.description && (
            <Section title="About the role">
              <JobDescriptionContent html={job.description} />
            </Section>
          )}

          {job.responsibilities?.length > 0 && (
            <Section title="Responsibilities">
              <ul className="space-y-2">
                {job.responsibilities.map((r: string) => (
                  <li key={r} className="flex gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {r}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {job.requirements?.length > 0 && (
            <Section title="Requirements">
              <ul className="space-y-2">
                {job.requirements.map((r: string) => (
                  <li key={r} className="flex gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {r}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {job.perks?.length > 0 && (
            <Section title="Perks & benefits">
              <div className="flex flex-wrap gap-2">
                {job.perks.map((p: string) => (
                  <span
                    key={p}
                    className="rounded-full border bg-muted/30 px-3 py-1 text-xs text-foreground/80"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {job.hospitalAbout && (
            <Section title={`About ${job.hospital}`}>
              <p className="text-sm leading-relaxed text-foreground/80">{job.hospitalAbout}</p>
            </Section>
          )}
        </div>

        {/* Sticky right rail */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Compensation
            </p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-semibold tracking-tight text-foreground">
              <IndianRupee className="h-5 w-5" />
              {job.salaryMin}–{job.salaryMax}
              <span className="text-base font-medium text-muted-foreground"> LPA</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Stat
                label="Experience"
                value={
                  job.experienceMin != null &&
                  job.experienceMax != null &&
                  (job.experienceMin > 0 || job.experienceMax > 0)
                    ? formatExp(job.experienceMin, job.experienceMax)
                    : job.experience || "—"
                }
              />
              <Stat label="Job type" value={job.type || "—"} />
              <Stat label="Location" value={job.city || "—"} />
              <Stat label="Posted" value={job.postedOn || "—"} />
            </div>
            <div className="mt-5 grid gap-2">
              <Button asChild size="lg">
                <Link to="/jobs/$jobId/edit" params={{ jobId: job.id }}>
                  <Edit3 className="mr-1.5 h-4 w-4" /> Edit Job
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/applicants" search={{ jobId: job.id, q: "" }}>
                  <Users className="mr-1.5 h-4 w-4" /> View Applicants
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Hiring Pipeline
            </p>
            <p className="mt-2 text-sm text-foreground/80">
              There are currently <strong>{job.applicants}</strong> applicant
              {job.applicants !== 1 ? "s" : ""} for this position.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function JobDescriptionContent({ html }: { html: string }) {
  if (isHtmlContent(html)) {
    return (
      <div
        className="text-sm leading-relaxed text-foreground/80 [&_a]:text-primary [&_a]:underline [&_em]:italic [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: sanitizeJobDescriptionHtml(html) }}
      />
    );
  }
  return <p className="text-sm leading-relaxed text-foreground/80">{html}</p>;
}
