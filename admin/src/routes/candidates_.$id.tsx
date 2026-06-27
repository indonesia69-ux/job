import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useAdminStore } from "@/lib/admin-store";
import { StatusBadge, VerifiedBadge } from "@/components/StatusBadge";
import { AdminEmptyState as EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Eye,
  Trash2,
  Ban,
  CheckCircle,
  Building2,
  Mail,
  MapPin,
  Stethoscope,
  LogIn,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Download,
  AlertCircle,
  FileQuestion,
  User,
  GraduationCap,
  Briefcase,
  Award,
  Globe2,
} from "lucide-react";

export const Route = createFileRoute("/candidates_/$id")({
  component: CandidateDetailsPage,
});

function getCandidatePortalUrl(): string | null {
  const configured = import.meta.env.VITE_CANDIDATE_URL?.trim() || "";
  if (configured) return configured;
  if (import.meta.env.PROD) {
    console.error("VITE_CANDIDATE_URL is required for production impersonation links.");
    return null;
  }
  return "http://localhost:8082";
}

function CandidateDetailsPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const store = useAdminStore();

  const candidate = store.candidates.find((c) => c.id === id);
  const applications = store.applications.filter((a) => a.candidateId === id);

  // Loading guard — store data may not be populated yet on direct URL navigation
  if (store.isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center p-10 space-y-4">
        <p className="text-muted-foreground text-lg">Candidate not found.</p>
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const [isGeneratedCvOpen, setIsGeneratedCvOpen] = useState(false);
  const [isGeneratedCvErrorOpen, setIsGeneratedCvErrorOpen] = useState(false);
  const [isUploadedCvErrorOpen, setIsUploadedCvErrorOpen] = useState(false);

  const hasCv = !!candidate.cvUrl;
  const hasDocuments = candidate.supportingDocuments && candidate.supportingDocuments.length > 0;

  const profile = useMemo(() => {
    let parsed: any = null;
    if (candidate.profileJson) {
      if (typeof candidate.profileJson === "string") {
        try {
          parsed = JSON.parse(candidate.profileJson);
        } catch (e) {
          // ignore
        }
      } else {
        parsed = candidate.profileJson;
      }
    }

    // Fallback: build form profile structure from candidate's database columns
    // exactly like how recruiter views it
    if (!parsed) {
      const hasDirectData = !!(
        candidate.summary ||
        candidate.educationList?.length ||
        candidate.experienceList?.length ||
        candidate.skillsList?.length ||
        candidate.proceduresList?.length ||
        candidate.certificationsList?.length ||
        candidate.languagesList?.length
      );

      if (!hasDirectData) return null;

      parsed = {
        name: candidate.name,
        headline: candidate.summary || `${candidate.role} - ${candidate.specialty}`,
        email: candidate.email,
        phone: candidate.phone,
        city: candidate.location,
        state: candidate.location,
        yearsExperience: candidate.experienceYears,
        summary: candidate.summary,
        qualifications: (candidate.educationList || []).map((e: any) => ({
          degree: e.degree,
          institution: e.institute || e.institution,
          year: e.year,
        })),
        experience: (candidate.experienceList || []).map((e: any) => ({
          role: e.role,
          hospital: e.employer || e.hospital,
          city: e.city || e.location,
          start: e.period || e.start,
          end: e.end || "",
          summary: Array.isArray(e.highlights) ? e.highlights.join("; ") : (e.summary || ""),
        })),
        clinicalSkills: candidate.skillsList || [],
        procedures: (candidate.proceduresList || []).map((p: any) => 
          typeof p === "string" ? { name: p, count: 0 } : { name: p.name, count: p.count || 0 }
        ),
        certifications: (candidate.certificationsList || []).map((c: any) => 
          typeof c === "string" ? { name: c, issuer: "", year: "" } : { name: c.name, issuer: c.issuer || "", year: c.year || "" }
        ),
        languages: candidate.languagesList || [],
      };
    }
    return parsed;
  }, [candidate]);

  const hasGeneratedCv = useMemo(() => {
    return !!profile;
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.history.back()}
          className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span>/</span>
        <Link to="/candidates" className="hover:text-foreground transition-colors">
          Candidates
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{candidate.name}</span>
      </nav>

      {/* Candidate Header Card */}
      <div className="rounded-xl border bg-card shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-3xl">
              {candidate.name[0]}
            </div>
            <div className="space-y-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {candidate.name}
                  {candidate.verified && <VerifiedBadge verified={true} />}
                </h1>
                <p className="text-muted-foreground font-medium mt-1">
                  {candidate.role} {candidate.specialty && `• ${candidate.specialty}`}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {candidate.email ? (
                    <a href={`mailto:${candidate.email}`} className="hover:underline text-foreground">
                      {candidate.email}
                    </a>
                  ) : (
                    <span className="italic">No email</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">📞</span>
                  {candidate.phone ? (
                    <a href={`tel:${candidate.phone}`} className="hover:underline text-foreground">
                      {candidate.phone}
                    </a>
                  ) : (
                    <span className="italic">No phone number</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {candidate.location || "Location not provided"}
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />{" "}
                  {candidate.experience
                    ? `${candidate.experience} experience`
                    : "Experience not specified"}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <StatusBadge status={candidate.status} />
                <span className="text-xs text-muted-foreground ml-2">
                  Joined {candidate.joined}
                </span>
                {!candidate.cvSource && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                    Incomplete Profile
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0 min-w-[180px]">
            <button
              onClick={async () => {
                try {
                  await store.toggleCandidateBlock(candidate.id);
                  toast.success(
                    `Candidate ${candidate.status === "Active" ? "suspended" : "reactivated"}`,
                  );
                } catch (e: any) {
                  toast.error(e.message || "Failed to toggle status");
                }
              }}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${candidate.status === "Active"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  : "bg-success/10 text-success hover:bg-success/20"
                }`}
            >
              {candidate.status === "Active" ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {candidate.status === "Active" ? "Suspend Account" : "Reactivate Account"}
            </button>

            <button
              onClick={async () => {
                try {
                  if (candidate.verified) {
                    await store.unverifyCandidate(candidate.id);
                    toast.success("Candidate verification removed");
                  } else {
                    await store.verifyCandidate(candidate.id);
                    toast.success("Candidate verified successfully");
                  }
                } catch (e: any) {
                  toast.error(e.message || "Failed to update verification");
                }
              }}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${candidate.verified
                  ? "border-warning/30 text-warning hover:bg-warning/10"
                  : "border-success/30 text-success hover:bg-success/10"
                }`}
            >
              {candidate.verified ? (
                <ShieldOff className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {candidate.verified ? "Remove Verification" : "Verify Candidate"}
            </button>

            <button
              onClick={async () => {
                if (
                  !confirm(`Login as ${candidate.name}? You'll get a 1-hour impersonation session.`)
                )
                  return;
                try {
                  const result = await store.impersonateUser(candidate.userId || candidate.id);
                  const candidateUrl = getCandidatePortalUrl();
                  if (!candidateUrl) {
                    toast.error("Candidate URL not configured");
                    return;
                  }
                  window.open(
                    `${candidateUrl}/impersonate?token=${encodeURIComponent(result.token)}`,
                    "_blank",
                  );
                  toast.success(`Impersonating ${result.user.name} — 1 hour session`);
                } catch (e: any) {
                  toast.error(e.message || "Failed to impersonate");
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Login as Candidate
            </button>

            <button
              onClick={async () => {
                if (confirm(`Are you sure you want to delete ${candidate.name}?`)) {
                  try {
                    await store.deleteCandidate(candidate.id);
                    toast.success("Candidate deleted");
                    router.history.back();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to delete candidate");
                  }
                }
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-card px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Candidate
            </button>
          </div>
        </div>
      </div>

      {/* CV & Documents */}
      <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
        <h2 className="text-base font-semibold">Curriculum Vitae (CV) &amp; Documents</h2>
        
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Platform Generated CV Button/Card */}
          <div className="rounded-xl border bg-muted/20 p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Platform Generated CV</span>
              </div>
              <p className="text-xs text-muted-foreground">
                CV built using the platform's profile form templates.
              </p>
            </div>
            <button
              onClick={() => {
                if (hasGeneratedCv) {
                  setIsGeneratedCvOpen(true);
                } else {
                  setIsGeneratedCvErrorOpen(true);
                }
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary py-2 px-3 text-xs font-semibold transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View Platform Generated CV
            </button>
          </div>

          {/* Uploaded by Candidate Button/Card */}
          <div className="rounded-xl border bg-muted/20 p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-success" />
                <span className="font-semibold text-sm">Uploaded by Candidate</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Manual CV document uploaded by the candidate.
              </p>
            </div>
            <button
              onClick={() => {
                if (hasCv) {
                  window.open(candidate.cvUrl, "_blank");
                } else {
                  setIsUploadedCvErrorOpen(true);
                }
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-success/10 hover:bg-success/20 text-success py-2 px-3 text-xs font-semibold transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              View Uploaded CV
            </button>
          </div>
        </div>

        {hasDocuments && (
          <div className="pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Supporting Documents ({candidate.supportingDocuments!.length})
            </p>
            <div className="space-y-2">
              {candidate.supportingDocuments!.map((doc: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[260px]">
                      {doc.name || `Document ${i + 1}`}
                    </span>
                  </div>
                  <button
                    onClick={() => window.open(doc.url, "_blank")}
                    className="text-sm text-primary hover:underline font-medium shrink-0"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Applications History */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold">Application History</h2>
          <p className="text-sm text-muted-foreground">
            All jobs this candidate has applied to across the platform.
          </p>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Job Title
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Hospital
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Recruiter
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Applied Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    App Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const job = store.jobs.find((j) => j.id === app.jobId);
                  const hospital = job
                    ? store.hospitals.find((h) => h.id === job.hospitalId)
                    : null;
                  const recruiter = job
                    ? store.recruiters.find((r) => r.id === job.recruiterId)
                    : null;

                  return (
                    <tr
                      key={app.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {job ? (
                          <Link
                            to="/jobs/$id"
                            params={{ id: job.id }}
                            className="hover:underline hover:text-primary"
                          >
                            {job.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">Job Deleted</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hospital ? (
                          <Link
                            to="/hospitals"
                            className="inline-flex items-center gap-1.5 hover:underline"
                          >
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {hospital.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {recruiter ? (
                          <Link
                            to="/recruiters/$id"
                            params={{ id: recruiter.id }}
                            className="hover:underline"
                          >
                            {recruiter.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{app.applied}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3">
                        {job && (
                          <Link
                            to="/jobs/$id"
                            params={{ id: job.id }}
                            className="rounded p-1.5 hover:bg-accent inline-flex"
                            title="View Job Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {applications.length === 0 && (
            <div className="p-8">
              <EmptyState
                icon={FileText}
                lottieFile="nothing_for_the_particular_query.json"
                title="No Applications"
                description="This candidate has not applied to any jobs yet."
              />
            </div>
          )}
        </div>
      </div>

      {/* Platform Generated CV Dialog */}
      <Dialog open={isGeneratedCvOpen} onOpenChange={setIsGeneratedCvOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Platform Generated CV
            </DialogTitle>
          </DialogHeader>

          {profile && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="border-b pb-4">
                <h3 className="text-2xl font-bold text-foreground">{profile.name || candidate.name}</h3>
                <p className="text-sm font-semibold text-primary mt-1">
                  {profile.headline || `${candidate.role} ${candidate.specialty ? `• ${candidate.specialty}` : ""}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {profile.email && <span>📧 {profile.email}</span>}
                  {profile.phone && <span>📞 {profile.phone}</span>}
                  {(profile.city || profile.state) && (
                    <span>📍 {[profile.city, profile.state].filter(Boolean).join(", ")}</span>
                  )}
                </div>
              </div>

              {/* Registration Council Info */}
              {(profile.registrationNumber || profile.registrationCouncil) && (
                <div className="bg-muted/30 border rounded-lg p-3 grid grid-cols-2 gap-4 text-xs">
                  {profile.registrationNumber && (
                    <div>
                      <span className="font-semibold text-muted-foreground block uppercase tracking-wider text-[10px]">Registration Number</span>
                      <span className="font-medium mt-0.5 block">{profile.registrationNumber}</span>
                    </div>
                  )}
                  {profile.registrationCouncil && (
                    <div>
                      <span className="font-semibold text-muted-foreground block uppercase tracking-wider text-[10px]">Registration Council</span>
                      <span className="font-medium mt-0.5 block">{profile.registrationCouncil}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Professional Summary */}
              {profile.summary && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b pb-1">
                    <User className="h-4 w-4 text-muted-foreground" /> About / Summary
                  </h4>
                  <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                    {profile.summary}
                  </p>
                </div>
              )}

              {/* Work Experience */}
              {profile.experience && profile.experience.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b pb-1">
                    <Briefcase className="h-4 w-4 text-muted-foreground" /> Clinical Experience
                  </h4>
                  <div className="space-y-4">
                    {profile.experience.map((exp: any, i: number) => (
                      <div key={i} className="text-xs space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-foreground">{exp.role}</span>
                          <span className="text-muted-foreground text-[11px] font-medium">{exp.start} {exp.end ? ` - ${exp.end}` : ""}</span>
                        </div>
                        <p className="text-primary font-medium text-[11px]">{exp.hospital}{exp.city ? `, ${exp.city}` : ""}</p>
                        {exp.summary && <p className="text-muted-foreground leading-relaxed whitespace-pre-line mt-1">{exp.summary}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Qualifications */}
              {profile.qualifications && profile.qualifications.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b pb-1">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" /> Education &amp; Qualifications
                  </h4>
                  <div className="space-y-3">
                    {profile.qualifications.map((qual: any, i: number) => (
                      <div key={i} className="text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-foreground">{qual.degree}</span>
                          <span className="text-muted-foreground text-[11px] font-medium">{qual.year}</span>
                        </div>
                        <p className="text-muted-foreground text-[11px]">{qual.institution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills, Certifications, Languages, Procedures */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Clinical Skills */}
                {profile.clinicalSkills && profile.clinicalSkills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground border-b pb-1">Clinical Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.clinicalSkills.map((skill: string, i: number) => (
                        <span key={i} className="bg-primary/5 text-primary text-[10px] font-medium px-2 py-0.5 rounded border border-primary/10">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procedures */}
                {profile.procedures && profile.procedures.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground border-b pb-1">Procedures Done</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.procedures.map((proc: any, i: number) => (
                        <span key={i} className="bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5 rounded border">
                          {proc.name} {proc.count ? `(${proc.count})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {profile.certifications && profile.certifications.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground border-b pb-1">Certifications</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                      {profile.certifications.map((cert: any, i: number) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{cert.name}</span>
                          {cert.issuer && ` - ${cert.issuer}`} {cert.year && `(${cert.year})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Languages */}
                {profile.languages && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground border-b pb-1">Languages</h4>
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(profile.languages) ? profile.languages.join(", ") : profile.languages}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Platform Generated CV Error Dialog */}
      <Dialog open={isGeneratedCvErrorOpen} onOpenChange={setIsGeneratedCvErrorOpen}>
        <DialogContent className="max-w-md p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <FileQuestion className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">Platform CV Not Found</DialogTitle>
              <p className="text-sm text-muted-foreground">
                cv not build by candidate
              </p>
            </div>
            <button
              onClick={() => setIsGeneratedCvErrorOpen(false)}
              className="mt-2 w-full rounded-md bg-muted hover:bg-muted/80 text-foreground py-2 text-sm font-semibold transition-colors border"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Uploaded CV Error Dialog */}
      <Dialog open={isUploadedCvErrorOpen} onOpenChange={setIsUploadedCvErrorOpen}>
        <DialogContent className="max-w-md p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">Manual CV Not Uploaded</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Candidate has not uploaded a manual CV.
              </p>
            </div>
            <button
              onClick={() => setIsUploadedCvErrorOpen(false)}
              className="mt-2 w-full rounded-md bg-muted hover:bg-muted/80 text-foreground py-2 text-sm font-semibold transition-colors border"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
