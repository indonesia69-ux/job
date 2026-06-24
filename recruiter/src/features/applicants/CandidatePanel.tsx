import { Briefcase, MapPin, FileText, Download } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { updateApplicationStatus } from "@/lib/recruiterData";
import {
  isTerminalApplicationStatus,
  statusPillClass,
  displayToApiStatus,
  type DisplayApplicantStatus,
} from "@/lib/applicationStatus";

import { WorkflowActions } from "./WorkflowActions";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifiedBadge } from "@/components/brand/VerifiedBadge";
import { Separator } from "@/components/ui/separator";
import type { Candidate } from "@/lib/mock";

export function CandidatePanel({
  candidate,
  onClose,
  onViewCv,
}: {
  candidate: Candidate | null;
  onClose: () => void;
  onViewCv: (id: string) => void;
}) {
  const router = useRouter();

  const setStatus = async (display: DisplayApplicantStatus, message: string) => {
    if (!candidate?.applicationId) {
      toast(message);
      return;
    }
    try {
      await updateApplicationStatus(candidate.applicationId, display, {}, apiStatus);
      toast.success(message);
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update application status");
    }
  };

  // Keep apiStatus only for the terminal-status check; WorkflowActions does its own conversion.
  const apiStatus = displayToApiStatus(candidate?.status as DisplayApplicantStatus);
  const locked = candidate ? isTerminalApplicationStatus(apiStatus) : true;
  const statusClass = candidate ? statusPillClass(candidate.status) : "";

  return (
    <Sheet open={!!candidate} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
        {candidate && (
          <>
            <SheetHeader className="space-y-3 border-b border-border bg-muted/30 p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-[14px] font-semibold">
                  {candidate.initials}
                </span>
                <div className="flex-1">
                  <SheetTitle className="font-display text-[18px]">
                    <div className="flex items-center gap-2">
                      {candidate.name}
                      {!candidate.cvSource && (
                        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 mt-1">
                          Incomplete
                        </span>
                      )}
                    </div>
                  </SheetTitle>
                  <div className="text-[12.5px] text-muted-foreground">
                    {candidate.role} · {candidate.specialty}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {candidate.verified && <VerifiedBadge label="Verified Candidate" />}
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                      Match {candidate.matchPercent}%
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass}`}
                    >
                      {candidate.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px] text-muted-foreground">
                <Meta icon={<MapPin className="h-3.5 w-3.5" />}>{candidate.location}</Meta>
                <Meta icon={<Briefcase className="h-3.5 w-3.5" />}>
                  {candidate.experienceYears} yrs
                </Meta>
                {/*
                 * R5: Contact info is redacted server-side for all recruiter requests.
                 * We render visually-blurred placeholder text so the layout doesn't collapse.
                 */}
                <Meta icon={<span className="h-3.5 w-3.5 text-[10px]">📞</span>}>
                  <span
                    className="select-none blur-md"
                    title="Contact details are hidden to protect candidate privacy"
                  >
                    +91 98XXX XXXXX
                  </span>
                </Meta>
                <Meta icon={<span className="h-3.5 w-3.5 text-[10px]">✉</span>}>
                  <span
                    className="select-none blur-md"
                    title="Contact details are hidden to protect candidate privacy"
                  >
                    cand•••@email.com
                  </span>
                </Meta>
              </div>

              <WorkflowActions
                applicationId={candidate.applicationId!}
                status={candidate.status}
                onUpdate={() => router.invalidate()}
              />

              <div className="flex flex-wrap gap-2 pt-1">
                {locked && (
                  <span className="self-center text-[11px] text-muted-foreground">
                    Status is final and cannot be changed.
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => onViewCv(candidate.id)}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> View CV
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9"
                  onClick={() => onViewCv(candidate.id)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download CV
                </Button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <Tabs defaultValue="workflow">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="exp">Experience</TabsTrigger>
                  <TabsTrigger value="edu">Education</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="docs">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="workflow" className="mt-5 space-y-5">
                  <Section title="Interview Details">
                    {candidate.interviewDate ? (
                      <div className="space-y-2 text-[13px] text-foreground">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                              Date
                            </span>
                            {new Date(candidate.interviewDate).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                              Type
                            </span>
                            {candidate.interviewType}
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                              Interviewer
                            </span>
                            {candidate.interviewerName} ({candidate.interviewerEmail})
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                              {candidate.interviewType === "Virtual" ? "Link" : "Venue"}
                            </span>
                            {candidate.meetingLink ? (
                              <a
                                href={candidate.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                {candidate.meetingLink}
                              </a>
                            ) : (
                              candidate.venue || "—"
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                              Round
                            </span>
                            {candidate.interviewRound}
                          </div>
                        </div>
                        {candidate.candidateResponseNote && (
                          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 dark:border-amber-700/40 dark:bg-amber-900/20">
                            <span className="block text-[11px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
                              Candidate's Reschedule Message
                            </span>
                            <p className="mt-1 text-[13px] italic text-foreground/80">
                              "{candidate.candidateResponseNote}"
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">
                        No interview scheduled yet.
                      </p>
                    )}
                  </Section>

                  <Separator />

                  <Section title="Document Requests">
                    {candidate.requestedDocumentList &&
                    candidate.requestedDocumentList.length > 0 ? (
                      <div className="space-y-2 text-[13px] text-foreground">
                        <ul className="list-disc pl-4 space-y-1">
                          {candidate.requestedDocumentList.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                        {candidate.documentRequestNote && (
                          <div className="mt-2 text-muted-foreground italic">
                            Note: {candidate.documentRequestNote}
                          </div>
                        )}
                        {candidate.applicationDocuments &&
                          candidate.applicationDocuments.length > 0 && (
                            <div className="mt-4 space-y-1.5">
                              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                Uploaded by Candidate
                              </span>
                              {candidate.applicationDocuments.map((doc: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                                >
                                  <span className="truncate text-[13px] text-foreground">
                                    {doc.name}
                                  </span>
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary text-[12px] hover:underline flex items-center gap-1"
                                  >
                                    <Download className="h-3.5 w-3.5" /> View
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">No documents requested.</p>
                    )}
                  </Section>

                  <Separator />

                  <Section title="Offer & Joining">
                    {candidate.offerLetterUrl ? (
                      <div className="space-y-2 text-[13px] text-foreground">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-emerald-500/10 px-3 py-2.5">
                          <span className="truncate text-emerald-800 font-medium">
                            Offer Letter Sent
                          </span>
                          <a
                            href={candidate.offerLetterUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 text-[12px] hover:underline flex items-center gap-1"
                          >
                            <FileText className="h-3.5 w-3.5" /> View PDF
                          </a>
                        </div>
                        {candidate.joiningDate && (
                          <div className="mt-3">
                            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
                              Confirmed Joining Date
                            </span>
                            {new Date(candidate.joiningDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">No offer letter sent.</p>
                    )}
                  </Section>
                </TabsContent>

                <TabsContent value="overview" className="mt-5 space-y-5">
                  {candidate.customAnswers && candidate.customAnswers.length > 0 && (
                    <Section title="Job-specific application answers">
                      <dl className="space-y-3">
                        {candidate.customAnswers.map((a) => (
                          <div
                            key={a.fieldId}
                            className="rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                          >
                            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              {a.label}
                              {a.required && (
                                <span className="ml-1 normal-case text-destructive">
                                  (required)
                                </span>
                              )}
                            </dt>
                            <dd className="mt-1 text-[13px] text-foreground">{a.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </Section>
                  )}
                  <Section title="Professional summary">
                    <p className="text-[13.5px] leading-relaxed text-foreground/90">
                      {candidate.summary || "—"}
                    </p>
                  </Section>
                  {candidate.formProfile?.publications &&
                    candidate.formProfile.publications.length > 0 && (
                      <Section title="Publications">
                        <ul className="list-disc space-y-1 pl-4 text-[13px] text-foreground/85">
                          {candidate.formProfile.publications.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </Section>
                    )}
                  {candidate.formProfile?.availability && (
                    <Section title="Availability">
                      <p className="text-[13px] text-foreground/85">
                        {candidate.formProfile.availability}
                      </p>
                    </Section>
                  )}
                  <Section title="Key procedures">
                    <Chips items={candidate.procedures} />
                  </Section>
                  <Section title="Languages">
                    <Chips items={candidate.languages} />
                  </Section>
                </TabsContent>

                <TabsContent value="exp" className="mt-5 space-y-5">
                  {candidate.experience.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No experience listed.</p>
                  ) : (
                    candidate.experience.map((e, i) => (
                      <div key={i} className="relative pl-5">
                        <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-accent" />
                        {i < candidate.experience.length - 1 && (
                          <span className="absolute left-[3px] top-4 h-full w-px bg-border" />
                        )}
                        <div className="text-[13.5px] font-medium">{e.role}</div>
                        <div className="text-[12px] text-muted-foreground">
                          {e.employer} · {e.location} · {e.period}
                        </div>
                        {e.highlights.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-foreground/85">
                            {e.highlights.map((h, j) => (
                              <li key={j}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="edu" className="mt-5 space-y-5">
                  <Section title="Education">
                    <div className="space-y-2">
                      {candidate.education.map((ed, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-[13px]"
                        >
                          <div>
                            <div className="font-medium">{ed.degree}</div>
                            <div className="text-[11.5px] text-muted-foreground">
                              {ed.institute}
                            </div>
                          </div>
                          <span className="text-[11.5px] text-muted-foreground">{ed.year}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title="Certifications">
                    <Chips items={candidate.certifications} />
                  </Section>
                  <Separator />
                  <div className="text-[12px] text-muted-foreground">
                    Registration:{" "}
                    <span className="text-foreground">{candidate.registration || "—"}</span>
                  </div>
                </TabsContent>

                <TabsContent value="skills" className="mt-5 space-y-5">
                  <Section title="Clinical skills">
                    <Chips
                      items={
                        candidate.formProfile?.clinicalSkills?.length
                          ? candidate.formProfile.clinicalSkills
                          : candidate.skills
                      }
                    />
                  </Section>
                  {candidate.formProfile?.technicalSkills &&
                    candidate.formProfile.technicalSkills.length > 0 && (
                      <Section title="Technical skills">
                        <Chips items={candidate.formProfile.technicalSkills} />
                      </Section>
                    )}
                  <Section title="Procedures performed">
                    <Chips items={candidate.procedures} />
                  </Section>
                </TabsContent>

                <TabsContent value="docs" className="mt-5 space-y-5">
                  <Section title="Candidate CV">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <span className="truncate text-[13px] text-foreground">
                        Sanitized ApronHanger CV
                      </span>
                      <button
                        type="button"
                        className="ml-2 shrink-0 text-primary hover:underline text-[12px] font-medium flex items-center gap-1"
                        onClick={() => onViewCv(candidate.id)}
                      >
                        <Download className="h-3.5 w-3.5" /> Open
                      </button>
                    </div>
                  </Section>

                  {/* Supporting Documents */}
                  {candidate.supportingDocuments && candidate.supportingDocuments.length > 0 && (
                    <Section title="Supporting Documents">
                      <div className="space-y-1.5">
                        {candidate.supportingDocuments.map((doc: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                          >
                            <span className="truncate text-[13px] text-foreground">
                              {doc.name || `Document ${i + 1}`}
                            </span>
                            <button
                              type="button"
                              className="ml-2 shrink-0 text-primary hover:underline text-[12px] font-medium flex items-center gap-1"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              <Download className="h-3.5 w-3.5" /> Open
                            </button>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Requested Documents (Workflow) */}
                  {candidate.applicationDocuments && candidate.applicationDocuments.length > 0 && (
                    <Section title="Requested Documents">
                      <div className="space-y-1.5">
                        {candidate.applicationDocuments.map((doc: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5"
                          >
                            <span className="truncate text-[13px] text-foreground">{doc.name}</span>
                            <button
                              type="button"
                              className="ml-2 shrink-0 text-primary hover:underline text-[12px] font-medium flex items-center gap-1"
                              onClick={() => window.open(doc.url, "_blank")}
                            >
                              <Download className="h-3.5 w-3.5" /> Open
                            </button>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Document checklist from step 15 */}
                  <Section title="Verification Documents Ready">
                    {candidate.formProfile?.documentChecklist &&
                    candidate.formProfile.documentChecklist.length > 0 ? (
                      <div className="space-y-1.5">
                        {candidate.formProfile.documentChecklist.map((doc: string) => (
                          <div
                            key={doc}
                            className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-[13px]"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-muted-foreground">
                        No documents marked as ready.
                      </p>
                    )}
                  </Section>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="truncate">{children}</span>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
function Chips({ items }: { items: string[] }) {
  if (!items.length) {
    return <span className="text-[12px] text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11.5px] text-foreground/80"
        >
          {s}
        </span>
      ))}
    </div>
  );
}
