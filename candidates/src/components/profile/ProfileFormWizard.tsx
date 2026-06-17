import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ApplicationError, submitApplication, syncCandidateProfile } from "@/lib/applications";
import { validateWizardStep } from "@/lib/validations";
import { isAuthenticated } from "@/store/authStore";
import {
  Activity,
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GraduationCap,
  Languages,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipInput, FieldRow } from "@/components/apply/FormPrimitives";
import { ROLE_TYPES, type RoleType } from "@/data/categories";
import {
  EMPTY_PROFILE,
  computeCompleteness,
  deriveHeadline,
  initialsFor,
  type ProfessionalHighlight,
  type Profile,
  type PublicationDetail,
} from "@/data/profile";
import { setProfile, useProfile } from "@/store/profileStore";
import type { Job } from "@/data/jobs";
import { JobCustomFieldsForm } from "@/components/apply/JobCustomFieldsForm";
import {
  formatResponseValue,
  validateCustomResponses,
  type CustomFieldResponses,
  type JobCustomField,
} from "@/lib/jobCustomFields";
import { cn } from "@/lib/utils";
import { INDIAN_STATES } from "@/data/states";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField } from "@/components/common/DatePickerField";
import { FileUploadZone } from "@/components/common/FileUploadZone";
import { type UploadedFile, uploadCvToBackend, uploadDocumentsToBackend } from "@/lib/fileUpload";
import { getToken } from "@/store/authStore";
import { CvMiniPreview } from "@/components/profile/CvMiniPreview";
import { LottiePlayer } from "@/components/common/LottiePlayer";

type FormExperience = {
  role: string;
  hospital: string;
  city: string;
  start: string;
  end: string;
  summary: string;
  current?: boolean;
  specialty: string;
  hospitalType: string;
  department: string;
  patientLoad: string;
  rota: string;
  keyProcedures: string[];
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  city: string;
  state: string;
  role: RoleType | "";
  specialty: string;
  grade: string;
  preferredRoleTypes: string[];
  registrationNumber: string;
  registrationCouncil: string;
  licenseStatus: string;
  specialistRegisterStatus: string;
  revalidationDate: string;
  indemnityProvider: string;
  rightToWork: string;
  visaStatus: string;
  yearsExperience: number;
  qualifications: { degree: string; institution: string; year: string }[];
  experience: FormExperience[];
  clinicalSkills: string[];
  technicalSkills: string[];
  procedures: { name: string; count: number }[];
  certifications: { name: string; issuer: string; year: string }[];
  publications: string[];
  publicationDetails: PublicationDetail[];
  totalCitations: string;
  hIndex: string;
  i10Index: string;
  scholarUrl: string;
  orcid: string;
  professionalHighlights: ProfessionalHighlight[];
  languages: string[];
  availability: string;
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  currentSalaryMin: number;
  currentSalaryMax: number;
  preferredLocations: string[];
  availabilityStatus: string;
  summary: string;
  documentChecklist: string[];
  documents: UploadedFile[];
};

const STEP_META = [
  {
    label: "Basic Details",
    description: "Contact and location details recruiters need before clinical review.",
    icon: UserRound,
  },
  {
    label: "Doctor Profile",
    description: "Specialty, grade and preferred appointment types for doctor matching.",
    icon: Stethoscope,
  },
  {
    label: "Registration & Compliance",
    description: "License, council, specialist register, indemnity and work eligibility.",
    icon: ShieldCheck,
  },
  {
    label: "Qualifications & Training",
    description: "Medical degree, postgraduate training, fellowships and institutional history.",
    icon: GraduationCap,
  },
  {
    label: "Clinical Experience",
    description:
      "A structured clinical timeline with rota, hospital type and patient-load context.",
    icon: Briefcase,
  },
  {
    label: "Clinical Skills",
    description: "Specialty skills and clinical areas that should surface in search and CV review.",
    icon: Activity,
  },
  {
    label: "Procedures",
    description: "Procedure volumes and hands-on exposure for high-signal doctor profiles.",
    icon: ClipboardCheck,
  },
  {
    label: "Research & Citations",
    description: "Publications, citation counts, h-index and academic profile links.",
    icon: BookOpen,
  },
  {
    label: "Audit, Teaching & Leadership",
    description: "Quality improvement, teaching, awards and leadership work recruiters value.",
    icon: Award,
  },
  {
    label: "Certifications",
    description: "Life-support, specialty, equipment and professional certifications.",
    icon: FileCheck2,
  },
  {
    label: "Availability & Preferences",
    description: "Notice period and work preferences for faster shortlisting.",
    icon: Sparkles,
  },
  {
    label: "Salary Expectations",
    description: "Expected range for transparent role matching.",
    icon: Banknote,
  },
  {
    label: "Languages",
    description: "Languages used in patient care, ward communication and documentation.",
    icon: Languages,
  },
  {
    label: "Professional Summary",
    description: "A concise clinician summary that appears near the top of the generated CV.",
    icon: FileText,
  },
  {
    label: "Document Vault",
    description: "Track verification-ready documents and attach supporting files where needed.",
    icon: FileCheck2,
  },
  {
    label: "Review & Submit",
    description: "Final quality check before saving or submitting your application.",
    icon: Check,
  },
] as const;

const STEPS = STEP_META.map((s) => s.label);

const DOCTOR_SPECIALTIES = [
  "General Medicine",
  "Cardiology",
  "Critical Care",
  "Emergency Medicine",
  "Radiology",
  "Orthopedics",
  "Pediatrics",
  "Obstetrics & Gynaecology",
  "Anaesthesia",
  "General Surgery",
  "Neurology",
  "Dermatology",
];

const GRADE_OPTIONS = [
  "Intern",
  "Junior Resident",
  "Senior Resident",
  "Registrar",
  "Fellow",
  "Associate Consultant",
  "Consultant",
  "Senior Consultant",
  "Professor",
];

const WORK_MODE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Locum",
  "Visiting consultant",
  "Teleconsultation",
  "Academic / teaching",
];

const LICENSE_STATUS_OPTIONS = ["Active", "Provisional", "Renewal pending", "Inactive"];

const SPECIALIST_REGISTER_OPTIONS = [
  "Not applicable",
  "Specialist registered",
  "Eligible / in process",
  "Not specialist registered",
];

const RIGHT_TO_WORK_OPTIONS = [
  "Indian citizen",
  "OCI / PIO",
  "Work visa",
  "Employer sponsorship required",
  "Prefer not to say",
];

const DOCUMENT_OPTIONS = [
  "Medical registration certificate",
  "MBBS / primary medical degree",
  "Postgraduate degree certificates",
  "Specialty fellowship / training proof",
  "ACLS/BLS/ALS certificate",
  "Indemnity / malpractice cover",
  "Right-to-work proof",
  "Passport / government ID",
  "Police verification / DBS",
  "References",
];

const HIGHLIGHT_CATEGORIES: ProfessionalHighlight["category"][] = [
  "Audit / QI",
  "Teaching",
  "Leadership",
  "Award",
];

function fromProfile(p: Profile): FormState {
  return {
    fullName: p.name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    linkedinUrl: p.linkedinUrl ?? "",
    city: p.city ?? "",
    state: p.state || p.city || "",
    role: (p.role ?? "") as RoleType | "",
    specialty: p.specialty ?? "",
    grade: p.grade ?? "",
    preferredRoleTypes: p.preferredRoleTypes ?? [],
    registrationNumber: p.registrationNumber ?? "",
    registrationCouncil: p.registrationCouncil ?? "",
    licenseStatus: p.licenseStatus ?? "Active",
    specialistRegisterStatus: p.specialistRegisterStatus ?? "",
    revalidationDate: p.revalidationDate ?? "",
    indemnityProvider: p.indemnityProvider ?? "",
    rightToWork: p.rightToWork ?? "",
    visaStatus: p.visaStatus ?? "",
    yearsExperience: p.yearsExperience ?? 0,
    qualifications: p.qualifications ?? [],
    experience: (p.experience ?? []).map((e) => ({
      role: e.role ?? "",
      hospital: e.hospital ?? "",
      city: e.city ?? "",
      start: e.start ?? "",
      end: e.current ? "" : (e.end ?? ""),
      summary: e.summary ?? "",
      current: Boolean(e.current) || e.end === "Present",
      specialty: e.specialty ?? "",
      hospitalType: e.hospitalType ?? "",
      department: e.department ?? "",
      patientLoad: e.patientLoad ?? "",
      rota: e.rota ?? "",
      keyProcedures: e.keyProcedures ?? [],
    })),
    clinicalSkills: p.clinicalSkills ?? [],
    technicalSkills: p.technicalSkills ?? [],
    procedures: p.procedures ?? [],
    certifications: p.certifications ?? [],
    publications: p.publications ?? [],
    publicationDetails: p.publicationDetails ?? [],
    totalCitations: p.totalCitations ?? "",
    hIndex: p.hIndex ?? "",
    i10Index: p.i10Index ?? "",
    scholarUrl: p.scholarUrl ?? "",
    orcid: p.orcid ?? "",
    professionalHighlights: p.professionalHighlights ?? [],
    languages: p.languages ?? [],
    availability: p.availability ?? "30 days notice",
    expectedSalaryMin: p.expectedSalaryMin ?? 0,
    expectedSalaryMax: p.expectedSalaryMax ?? 0,
    currentSalaryMin: p.currentSalaryMin ?? 0,
    currentSalaryMax: p.currentSalaryMax ?? 0,
    preferredLocations: p.preferredLocations ?? [],
    availabilityStatus: p.availabilityStatus ?? "",
    summary: p.summary ?? "",
    documentChecklist: p.documentChecklist ?? [],
    documents: (p.supportingDocuments ?? []).map((doc) => ({
      name: doc.name,
      url: doc.url,
      publicId: doc.publicId,
      mime: doc.mime,
    })),
  };
}

function toProfile(s: FormState): Profile {
  const publicationDetails = s.publicationDetails.filter((p) =>
    Boolean(
      p.title.trim() || p.journal.trim() || p.authors.trim() || p.year.trim() || p.doi.trim(),
    ),
  );
  const formattedPublications = publicationDetails.map(formatPublicationDetail);
  const publications = Array.from(
    new Set([...s.publications.map((p) => p.trim()).filter(Boolean), ...formattedPublications]),
  );
  const base: Profile = {
    ...EMPTY_PROFILE,
    name: s.fullName.trim() || "Healthcare Professional",
    email: s.email.trim(),
    phone: s.phone.trim(),
    linkedinUrl: s.linkedinUrl.trim(),
    city: s.city.trim() || s.state,
    state: s.state,
    role: s.role as RoleType | "",
    specialty: s.specialty.trim(),
    grade: s.grade.trim(),
    preferredRoleTypes: s.preferredRoleTypes,
    registrationNumber: s.registrationNumber.trim(),
    registrationCouncil: s.registrationCouncil.trim(),
    licenseStatus: s.licenseStatus,
    specialistRegisterStatus: s.specialistRegisterStatus,
    revalidationDate: s.revalidationDate,
    indemnityProvider: s.indemnityProvider.trim(),
    rightToWork: s.rightToWork,
    visaStatus: s.visaStatus.trim(),
    yearsExperience: s.yearsExperience,
    qualifications: s.qualifications.filter((q) =>
      Boolean(q.degree.trim() || q.institution.trim() || q.year.trim()),
    ),
    experience: s.experience
      .filter((e) => Boolean(e.role.trim() || e.hospital.trim()))
      .map((e) => ({
        ...e,
        role: e.role.trim(),
        hospital: e.hospital.trim(),
        city: e.city.trim(),
        start: e.start,
        end: e.current ? "" : e.end,
        summary: e.summary.trim(),
        specialty: e.specialty.trim(),
        hospitalType: e.hospitalType.trim(),
        department: e.department.trim(),
        patientLoad: e.patientLoad.trim(),
        rota: e.rota.trim(),
        keyProcedures: e.keyProcedures,
      })),
    clinicalSkills: s.clinicalSkills,
    technicalSkills: s.technicalSkills,
    procedures: s.procedures.filter((p) => Boolean(p.name.trim())),
    certifications: s.certifications.filter((c) =>
      Boolean(c.name.trim() || c.issuer.trim() || c.year.trim()),
    ),
    publications,
    publicationDetails,
    totalCitations: s.totalCitations.trim(),
    hIndex: s.hIndex.trim(),
    i10Index: s.i10Index.trim(),
    scholarUrl: s.scholarUrl.trim(),
    orcid: s.orcid.trim(),
    professionalHighlights: s.professionalHighlights.filter((h) =>
      Boolean(h.title.trim() || h.detail.trim()),
    ),
    languages: s.languages,
    availability: s.availability,
    expectedSalaryMin: s.expectedSalaryMin,
    expectedSalaryMax: s.expectedSalaryMax,
    currentSalaryMin: s.currentSalaryMin,
    currentSalaryMax: s.currentSalaryMax,
    preferredLocations: s.preferredLocations,
    availabilityStatus: s.availabilityStatus,
    summary: s.summary.trim(),
    documentChecklist: s.documentChecklist,
    supportingDocuments: s.documents.map((d) => ({
      name: d.name,
      url: d.url || "",
      publicId: d.publicId || "",
      mime: d.mime || "",
    })),
    verified: !!s.registrationNumber && s.licenseStatus === "Active",
  };
  base.avatar = initialsFor(base.name);
  base.headline = deriveHeadline(base);
  base.completeness = computeCompleteness(base);
  return base;
}

export type ProfileFormWizardProps = {
  /** When provided, the wizard is in "apply to job" mode and the back link returns to the chooser. */
  job?: Job;
  /** Where to navigate after a successful submit. Defaults to `/cv-preview`. */
  redirectTo?: "/cv-preview" | "/profile" | "/applications";
  /** When true, submitting also creates an application for `job`. */
  applyMode?: boolean;
};

export function ProfileFormWizard({
  job,
  redirectTo = "/cv-preview",
  applyMode = false,
}: ProfileFormWizardProps) {
  const existing = useProfile();
  const navigate = useNavigate();
  const [state, setState] = useState<FormState>(() =>
    existing ? fromProfile(existing) : fromProfile(EMPTY_PROFILE),
  );
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const jobCustomFields: JobCustomField[] = job?.customApplicationFields ?? [];
  const [customResponses, setCustomResponses] = useState<CustomFieldResponses>({});

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);
  const readiness = useMemo(() => computeDoctorReadiness(state), [state]);
  const draftProfile = useMemo(() => toProfile(state), [state]);
  const currentStep = STEP_META[step];
  const CurrentIcon = currentStep.icon;

  const handleSubmit = async () => {
    for (let i = 0; i < STEPS.length - 1; i++) {
      const err = validateWizardStep(i, state);
      if (err) {
        setStepError(err);
        setStep(i);
        toast.error(err);
        return;
      }
    }
    setStepError(null);
    const profile = toProfile(state);
    setProfile(profile);
    if (applyMode && job) {
      if (jobCustomFields.length > 0) {
        const customErr = validateCustomResponses(jobCustomFields, customResponses);
        if (customErr) {
          toast.error(customErr);
          return;
        }
      }
      setSubmitting(true);
      try {
        const attachment = state.documents[0];
        let cvData = undefined;
        const supportingDocsUpload = undefined;

        // In apply mode, the first file is treated as the job attachment (CV or cover letter)
        // If we want multiple docs, we should handle them differently, but for now applyMode handles CV
        if (attachment?.file) {
          const uploadResult = await uploadCvToBackend(attachment.file, getToken() ?? "");
          cvData = {
            cvUrl: uploadResult.url,
            cvCloudinaryId: uploadResult.publicId,
            name: uploadResult.name || attachment.name,
            mime: uploadResult.mime || attachment.mime,
          };
        }
        await submitApplication(job.id, profile, customResponses, cvData, supportingDocsUpload);
        toast.success("Application submitted!");
        navigate({ to: redirectTo });
      } catch (e) {
        if (e instanceof ApplicationError && e.code === "DUPLICATE") {
          toast.error(e.message);
        } else {
          toast.error(e instanceof Error ? e.message : "Could not submit application");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (isAuthenticated()) {
      setSubmitting(true);
      try {
        // Upload any attached documents to Cloudinary before saving the profile.
        // This covers the "save profile" (non-apply) flow in the Document Vault step.
        let supportingDocsUpload:
          | { url: string; publicId: string; name?: string; mime?: string }[]
          | undefined = undefined;

        const validFiles = state.documents.filter((d) => !!d.file).map((d) => d.file as File);
        if (validFiles.length > 0) {
          try {
            supportingDocsUpload = await uploadDocumentsToBackend(validFiles, getToken() ?? "");
            toast.success("Documents uploaded to cloud");
          } catch (uploadErr) {
            // Non-fatal — warn the user but still save the rest of the profile
            toast.warning(
              "Could not upload documents to cloud — profile will be saved without the attachments.",
            );
          }
        }

        // Pass undefined for cvUploadData since we are not uploading a CV here,
        // only supporting documents.
        await syncCandidateProfile(profile, undefined, supportingDocsUpload);
        if (!applyMode) {
          setSubmitted(true);
          setTimeout(() => navigate({ to: redirectTo }), 1500);
          return;
        } else {
          toast.success("Profile saved");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save profile");
      } finally {
        setSubmitting(false);
      }
    }
    navigate({ to: redirectTo });
  };

  const goNext = () => {
    const err = validateWizardStep(step, state);
    if (err) {
      setStepError(err);
      toast.error(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submitLabel = applyMode && job ? "Submit application" : "Save & generate CV";

  return (
    <div
      className={cn("mx-auto max-w-[1440px] px-6 py-8 animate-fade-in-up", applyMode && "pb-28")}
    >
      {job ? (
        <Link
          to="/apply/$jobId"
          params={{ jobId: job.id }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> Back
        </Link>
      ) : (
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> Back to profile
        </Link>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="border-b bg-[linear-gradient(135deg,oklch(0.21_0.05_265),oklch(0.55_0.18_262))] px-6 py-6 text-primary-foreground md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                {job ? "Doctor-ready application form" : "Doctor-ready CV builder"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {job ? `${job.role} · ${job.hospital}` : "Build a premium clinical profile"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-85">
                Capture the details hospitals actually scan for: registration, specialty, clinical
                exposure, procedures, research, compliance and document readiness.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 text-right ring-1 ring-white/15">
              <p className="text-[11px] uppercase tracking-wider opacity-75">
                Application readiness
              </p>
              <p className="text-2xl font-semibold">{readiness.score}%</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <SignalPill label="Clinical identity" value={state.specialty || state.role} />
            <SignalPill label="Experience" value={`${state.yearsExperience || 0} yrs`} />
            <SignalPill
              label="Research"
              value={`${state.publicationDetails.length + state.publications.length} items`}
            />
            <SignalPill label="Documents" value={`${state.documentChecklist.length}/10 ready`} />
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden bg-muted">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Doctor profile
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {readiness.score}% ready
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-primary">
                {readiness.score}
              </div>
            </div>
            {readiness.missing.length > 0 && (
              <div className="mt-4 rounded-xl bg-surface-2 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Next best fixes
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-foreground/80">
                  {readiness.missing.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="hidden rounded-2xl border bg-card p-3 shadow-soft lg:block">
            <CvMiniPreview profile={draftProfile} />
          </div>

          <ol className="space-y-1 rounded-2xl border bg-card p-2 shadow-soft">
            {STEP_META.map((meta, i) => {
              const Icon = meta.icon;
              const done = i < step;
              const active = i === step;
              return (
                <li key={meta.label}>
                  <button
                    onClick={() => setStep(i)}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors",
                      active && "bg-brand-soft text-primary",
                      !active && "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                        done && "border-brand bg-brand text-brand-foreground",
                        active && !done && "border-primary bg-primary text-primary-foreground",
                        !done && !active && "border-border bg-surface",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate", active && "font-semibold")}>
                      {meta.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="rounded-2xl border bg-card p-6 shadow-card md:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <CurrentIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {currentStep.label}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {currentStep.description}
              </p>
              {step === 14 && job && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Documents uploaded here are attached only to this job application. Your saved CV
                  profile keeps the document readiness checklist.
                </p>
              )}
            </div>
          </div>

          {stepError && (
            <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {stepError}
            </p>
          )}

          <div className="mt-7 space-y-6">
            {renderStep(
              step,
              state,
              set,
              !!job,
              jobCustomFields,
              customResponses,
              setCustomResponses,
            )}
          </div>

          <div className="mt-10 flex items-center justify-between gap-3 border-t bg-card pt-5">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setStepError(null);
                setStep((s) => Math.max(0, s - 1));
              }}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext}>
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (applyMode ? "Submitting..." : "Saving...") : submitLabel}{" "}
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {applyMode && job && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-6 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Applying to</p>
              <p className="truncate text-sm font-semibold text-foreground">
                {job.role} · {job.hospital}
              </p>
            </div>
            <Button type="button" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : submitLabel} <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <LottiePlayer src="/successful_signup_signin.json" loop={false} className="h-32 w-32" />
        </div>
      )}
    </div>
  );
}

function renderStep(
  step: number,
  s: FormState,
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void,
  isJobMode: boolean,
  jobCustomFields: JobCustomField[],
  customResponses: CustomFieldResponses,
  setCustomResponses: (v: CustomFieldResponses) => void,
) {
  switch (step) {
    case 0:
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow label="Full name" required>
            <Input value={s.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </FieldRow>
          <FieldRow label="Email" required>
            <Input type="email" value={s.email} onChange={(e) => set("email", e.target.value)} />
          </FieldRow>
          <FieldRow label="Phone" required>
            <Input value={s.phone} onChange={(e) => set("phone", e.target.value)} />
          </FieldRow>
          <FieldRow label="City">
            <Input value={s.city} onChange={(e) => set("city", e.target.value)} />
          </FieldRow>
          <FieldRow label="State" required>
            <Select value={s.state || undefined} onValueChange={(v) => set("state", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="LinkedIn profile" hint="Optional public profile URL">
            <Input
              type="url"
              value={s.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
              placeholder="https://www.linkedin.com/in/your-profile"
            />
          </FieldRow>
        </div>
      );
    case 1:
      return (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldRow label="Role" required>
              <Select value={s.role || undefined} onValueChange={(v) => set("role", v as RoleType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {rt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Years of experience" required>
              <Input
                type="number"
                min={0}
                max={60}
                value={s.yearsExperience}
                onChange={(e) => set("yearsExperience", Number(e.target.value))}
              />
            </FieldRow>
            <FieldRow
              label="Primary specialty"
              required={s.role === "Doctor" || s.role === "Dentist"}
            >
              <ChipInput
                values={s.specialty ? [s.specialty] : []}
                onChange={(v) => set("specialty", v.at(-1) ?? "")}
                placeholder="Type specialty and press Enter"
                suggestions={
                  s.role === "Doctor"
                    ? DOCTOR_SPECIALTIES
                    : s.role === "Dentist"
                      ? ["Dental Surgery", "Endodontics", "Orthodontics", "Prosthodontics"]
                      : ["ICU", "OT", "Radiology", "Laboratory", "Hospital Ops"]
                }
              />
            </FieldRow>
            <FieldRow label="Current grade" required={s.role === "Doctor"}>
              <Select value={s.grade || undefined} onValueChange={(v) => set("grade", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
          <OptionGrid
            label="Preferred role types"
            options={WORK_MODE_OPTIONS}
            values={s.preferredRoleTypes}
            onChange={(v) => set("preferredRoleTypes", v)}
          />
        </div>
      );
    case 2:
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow
            label={
              s.role === "Dentist"
                ? "Dental Council"
                : s.role === "Nurse"
                  ? "Nursing Council"
                  : "Medical Council"
            }
            required={s.role === "Doctor" || s.role === "Dentist"}
          >
            <Input
              value={s.registrationCouncil}
              onChange={(e) => set("registrationCouncil", e.target.value)}
              placeholder="e.g. National Medical Commission"
            />
          </FieldRow>
          <FieldRow
            label={
              s.role === "Dentist"
                ? "DCI registration number"
                : s.role === "Nurse"
                  ? "INC registration number"
                  : "Registration number"
            }
            required={s.role === "Doctor" || s.role === "Dentist" || s.role === "Nurse"}
          >
            <Input
              value={s.registrationNumber}
              onChange={(e) => set("registrationNumber", e.target.value)}
            />
          </FieldRow>
          <FieldRow label="License status" required={s.role === "Doctor" || s.role === "Dentist"}>
            <Select
              value={s.licenseStatus || undefined}
              onValueChange={(v) => set("licenseStatus", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select license status" />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Specialist register status">
            <Select
              value={s.specialistRegisterStatus || undefined}
              onValueChange={(v) => set("specialistRegisterStatus", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALIST_REGISTER_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Revalidation / renewal date">
            <DatePickerField
              value={s.revalidationDate}
              onChange={(v) => set("revalidationDate", v)}
              placeholder="Select date"
            />
          </FieldRow>
          <FieldRow label="Indemnity / malpractice cover">
            <Input
              value={s.indemnityProvider}
              onChange={(e) => set("indemnityProvider", e.target.value)}
              placeholder="Provider or policy reference"
            />
          </FieldRow>
          <FieldRow label="Right to work">
            <Select value={s.rightToWork || undefined} onValueChange={(v) => set("rightToWork", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select right-to-work status" />
              </SelectTrigger>
              <SelectContent>
                {RIGHT_TO_WORK_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Visa / sponsorship notes">
            <Input
              value={s.visaStatus}
              onChange={(e) => set("visaStatus", e.target.value)}
              placeholder="e.g. Not applicable, sponsorship required"
            />
          </FieldRow>
        </div>
      );
    case 3:
      return (
        <Repeater
          items={s.qualifications}
          onChange={(v) => set("qualifications", v)}
          empty={{ degree: "", institution: "", year: "" }}
          render={(item, i, update) => (
            <div className="grid gap-3 md:grid-cols-3">
              <FieldRow label="Degree / training" required>
                <Input
                  value={item.degree}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes(",")) {
                      toast.error(
                        "Please add one degree per row using the 'Add qualification' button",
                      );
                    }
                    update(i, { ...item, degree: val.replace(/,/g, "") });
                  }}
                  placeholder="MBBS, MD, DM, DNB, Fellowship"
                />
              </FieldRow>
              <FieldRow label="Institution" required>
                <Input
                  value={item.institution}
                  onChange={(e) => update(i, { ...item, institution: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Year completed" required>
                <Input
                  type="number"
                  min={1950}
                  max={new Date().getFullYear()}
                  value={item.year}
                  onChange={(e) => update(i, { ...item, year: e.target.value })}
                  placeholder="e.g. 2018"
                />
              </FieldRow>
            </div>
          )}
          addLabel="Add qualification"
        />
      );
    case 4:
      return (
        <Repeater
          items={s.experience}
          onChange={(v) => set("experience", v)}
          empty={{
            role: "",
            hospital: "",
            city: "",
            start: "",
            end: "",
            summary: "",
            current: false,
            specialty: s.specialty,
            hospitalType: "",
            department: "",
            patientLoad: "",
            rota: "",
            keyProcedures: [],
          }}
          render={(item, i, update) => (
            <div className="grid gap-3 md:grid-cols-2">
              <FieldRow label="Role / designation" required>
                <Input
                  value={item.role}
                  onChange={(e) => update(i, { ...item, role: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Hospital / employer" required>
                <Input
                  value={item.hospital}
                  onChange={(e) => update(i, { ...item, hospital: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="City" required>
                <Input
                  value={item.city}
                  onChange={(e) => update(i, { ...item, city: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Hospital type">
                <Input
                  value={item.hospitalType}
                  onChange={(e) => update(i, { ...item, hospitalType: e.target.value })}
                  placeholder="Tertiary care, teaching hospital, clinic"
                />
              </FieldRow>
              <FieldRow label="Specialty / department focus" required={s.role === "Doctor"}>
                <Input
                  value={item.specialty}
                  onChange={(e) => update(i, { ...item, specialty: e.target.value })}
                  placeholder="e.g. Interventional cardiology"
                />
              </FieldRow>
              <FieldRow label="Clinical setting">
                <Input
                  value={item.department}
                  onChange={(e) => update(i, { ...item, department: e.target.value })}
                  placeholder="OPD, ward, ICU, OT, cath lab"
                />
              </FieldRow>
              <FieldRow label="Start date" required>
                <DatePickerField
                  value={item.start}
                  onChange={(v) => update(i, { ...item, start: v })}
                  toDate={new Date()}
                  placeholder="Select start date"
                />
              </FieldRow>
              <div className="space-y-2">
                <FieldRow label="End date" required={!item.current}>
                  <DatePickerField
                    value={item.end}
                    onChange={(v) => update(i, { ...item, end: v })}
                    toDate={new Date()}
                    disabled={item.current}
                    placeholder={item.current ? "Present" : "Select end date"}
                  />
                </FieldRow>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={Boolean(item.current)}
                    onCheckedChange={(v) =>
                      update(i, {
                        ...item,
                        current: Boolean(v),
                        end: v ? "" : item.end,
                      })
                    }
                  />
                  I currently work here
                </label>
              </div>
              <FieldRow label="Patient load / case mix">
                <Input
                  value={item.patientLoad}
                  onChange={(e) => update(i, { ...item, patientLoad: e.target.value })}
                  placeholder="e.g. 40 OPD patients/day, 12-bed ICU"
                />
              </FieldRow>
              <FieldRow label="Rota / on-call exposure">
                <Input
                  value={item.rota}
                  onChange={(e) => update(i, { ...item, rota: e.target.value })}
                  placeholder="e.g. 1:4 emergency rota, night shifts"
                />
              </FieldRow>
              <FieldRow label="Key procedures in this role" className="md:col-span-2">
                <ChipInput
                  values={item.keyProcedures}
                  onChange={(v) => update(i, { ...item, keyProcedures: v })}
                  placeholder="Add procedure and press Enter"
                  suggestions={[
                    "OPD",
                    "ICU rounds",
                    "Emergency calls",
                    "Surgery assist",
                    "Cath lab",
                  ]}
                />
              </FieldRow>
              <FieldRow label="Clinical impact summary" className="md:col-span-2">
                <Textarea
                  rows={3}
                  value={item.summary}
                  onChange={(e) => update(i, { ...item, summary: e.target.value })}
                  placeholder="Mention responsibilities, case complexity, outcomes, supervision and notable achievements."
                />
              </FieldRow>
            </div>
          )}
          addLabel="Add clinical experience"
        />
      );
    case 5:
      return (
        <FieldRow
          label={s.role === "Nurse" ? "Patient care & ward skills" : "Clinical skills"}
          required
          hint="Press Enter to add"
        >
          <ChipInput
            values={s.clinicalSkills}
            onChange={(v) => set("clinicalSkills", v)}
            placeholder="Type a skill and press Enter"
            suggestions={
              s.role === "Doctor"
                ? [
                    "OPD Management",
                    "ICU Care",
                    "Emergency Medicine",
                    "Echocardiography",
                    "Perioperative Care",
                  ]
                : s.role === "Nurse"
                  ? ["IV Cannulation", "Wound Care", "Ventilator Care", "Triage"]
                  : s.role === "Dentist"
                    ? ["RCT", "Restorations", "Crowns", "Implants"]
                    : ["Sterilization", "Equipment Setup", "Patient Handling"]
            }
          />
        </FieldRow>
      );
    case 6:
      return (
        <Repeater
          items={s.procedures}
          onChange={(v) => set("procedures", v)}
          empty={{ name: "", count: 0 }}
          render={(item, i, update) => (
            <div className="grid gap-3 md:grid-cols-[1fr_140px]">
              <FieldRow label="Procedure">
                <Input
                  value={item.name}
                  onChange={(e) => update(i, { ...item, name: e.target.value })}
                  placeholder={
                    s.role === "Dentist"
                      ? "e.g. Root Canal Therapy"
                      : s.role === "Nurse"
                        ? "e.g. Catheterization"
                        : "e.g. Coronary Angiography"
                  }
                />
              </FieldRow>
              <FieldRow label="Count">
                <Input
                  type="number"
                  min={0}
                  value={item.count}
                  onChange={(e) => update(i, { ...item, count: Number(e.target.value) })}
                />
              </FieldRow>
            </div>
          )}
          addLabel="Add procedure"
        />
      );
    case 7:
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <FieldRow label="Total citations">
              <Input
                inputMode="numeric"
                value={s.totalCitations}
                onChange={(e) => set("totalCitations", e.target.value)}
              />
            </FieldRow>
            <FieldRow label="h-index">
              <Input
                inputMode="numeric"
                value={s.hIndex}
                onChange={(e) => set("hIndex", e.target.value)}
              />
            </FieldRow>
            <FieldRow label="i10-index">
              <Input
                inputMode="numeric"
                value={s.i10Index}
                onChange={(e) => set("i10Index", e.target.value)}
              />
            </FieldRow>
            <FieldRow label="Google Scholar URL" className="md:col-span-2">
              <Input
                type="url"
                value={s.scholarUrl}
                onChange={(e) => set("scholarUrl", e.target.value)}
                placeholder="https://scholar.google.com/..."
              />
            </FieldRow>
            <FieldRow label="ORCID" className="md:col-span-2">
              <Input
                value={s.orcid}
                onChange={(e) => set("orcid", e.target.value)}
                placeholder="0000-0000-0000-0000"
              />
            </FieldRow>
          </div>
          <Repeater
            items={s.publicationDetails}
            onChange={(v) => set("publicationDetails", v)}
            empty={{ title: "", authors: "", journal: "", year: "", doi: "", citations: 0 }}
            render={(item, i, update) => (
              <div className="grid gap-3 md:grid-cols-4">
                <FieldRow label="Publication title" className="md:col-span-2">
                  <Input
                    value={item.title}
                    onChange={(e) => update(i, { ...item, title: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Journal / conference">
                  <Input
                    value={item.journal}
                    onChange={(e) => update(i, { ...item, journal: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Year">
                  <Input
                    inputMode="numeric"
                    value={item.year}
                    onChange={(e) => update(i, { ...item, year: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Authors" className="md:col-span-2">
                  <Input
                    value={item.authors}
                    onChange={(e) => update(i, { ...item, authors: e.target.value })}
                    placeholder="Keep your name visible"
                  />
                </FieldRow>
                <FieldRow label="DOI / PMID">
                  <Input
                    value={item.doi}
                    onChange={(e) => update(i, { ...item, doi: e.target.value })}
                  />
                </FieldRow>
                <FieldRow label="Citations">
                  <Input
                    type="number"
                    min={0}
                    value={item.citations}
                    onChange={(e) => update(i, { ...item, citations: Number(e.target.value) })}
                  />
                </FieldRow>
              </div>
            )}
            addLabel="Add publication"
          />
          <FieldRow label="Additional publication notes" hint="Optional legacy citation strings">
            <ChipInput
              values={s.publications}
              onChange={(v) => set("publications", v)}
              placeholder="Paste citation and press Enter"
            />
          </FieldRow>
        </div>
      );
    case 8:
      return (
        <Repeater
          items={s.professionalHighlights as any}
          onChange={(v) => set("professionalHighlights", v as any)}
          empty={{ category: "Audit / QI", title: "", detail: "", year: "" }}
          render={(item, i, update) => (
            <div className="grid gap-3 md:grid-cols-4">
              <FieldRow label="Category">
                <Select
                  value={item.category}
                  onValueChange={(v) =>
                    update(i, { ...item, category: v as ProfessionalHighlight["category"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HIGHLIGHT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Title" className="md:col-span-2">
                <Input
                  value={item.title}
                  onChange={(e) => update(i, { ...item, title: e.target.value })}
                  placeholder="e.g. Sepsis pathway audit"
                />
              </FieldRow>
              <FieldRow label="Year">
                <Input
                  value={item.year}
                  onChange={(e) => update(i, { ...item, year: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Impact / detail" className="md:col-span-4">
                <Textarea
                  rows={3}
                  value={item.detail}
                  onChange={(e) => update(i, { ...item, detail: e.target.value })}
                  placeholder="Mention measurable outcomes, teaching responsibility, team size or recognition."
                />
              </FieldRow>
            </div>
          )}
          addLabel="Add highlight"
        />
      );
    case 9:
      return (
        <Repeater
          items={s.certifications}
          onChange={(v) => set("certifications", v)}
          empty={{ name: "", issuer: "", year: "" }}
          render={(item, i, update) => (
            <div className="grid gap-3 md:grid-cols-3">
              <FieldRow label="Name">
                <Input
                  value={item.name}
                  onChange={(e) => update(i, { ...item, name: e.target.value })}
                  placeholder="ACLS, BLS, ATLS, ultrasound, fellowship"
                />
              </FieldRow>
              <FieldRow label="Issuer">
                <Input
                  value={item.issuer}
                  onChange={(e) => update(i, { ...item, issuer: e.target.value })}
                />
              </FieldRow>
              <FieldRow label="Year">
                <Input
                  value={item.year}
                  onChange={(e) => update(i, { ...item, year: e.target.value })}
                />
              </FieldRow>
            </div>
          )}
          addLabel="Add certification"
        />
      );
    case 10:
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow label="Availability / notice period">
            <Select value={s.availability} onValueChange={(v) => set("availability", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Immediately",
                  "15 days notice",
                  "30 days notice",
                  "60 days notice",
                  "90 days notice",
                ].map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label="Technical / software skills">
            <ChipInput
              values={s.technicalSkills}
              onChange={(v) => set("technicalSkills", v)}
              placeholder="EMR, PACS, MS Excel..."
              suggestions={["EMR", "PACS", "MS Excel", "Stata", "R", "Ultrasound console"]}
            />
          </FieldRow>
          <div className="md:col-span-2">
            <OptionGrid
              label="Role preferences"
              options={WORK_MODE_OPTIONS}
              values={s.preferredRoleTypes}
              onChange={(v) => set("preferredRoleTypes", v)}
            />
          </div>
        </div>
      );
    case 11:
      return (
        <div className="space-y-6">
          <FieldRow
            label={`Expected salary range: ₹${s.expectedSalaryMin}-${s.expectedSalaryMax} LPA`}
            required
          >
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">Minimum (LPA)</p>
                <Slider
                  value={[s.expectedSalaryMin]}
                  min={0}
                  max={120}
                  step={1}
                  onValueChange={(v) => {
                    const min = v[0];
                    set("expectedSalaryMin", min);
                    if (min > s.expectedSalaryMax) set("expectedSalaryMax", min);
                  }}
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">Maximum (LPA)</p>
                <Slider
                  value={[s.expectedSalaryMax]}
                  min={s.expectedSalaryMin}
                  max={120}
                  step={1}
                  onValueChange={(v) => set("expectedSalaryMax", v[0])}
                />
              </div>
              {s.expectedSalaryMin > s.expectedSalaryMax && (
                <p className="text-xs text-destructive">Minimum cannot exceed maximum</p>
              )}
            </div>
          </FieldRow>

          <FieldRow
            label={`Current salary range: ₹${s.currentSalaryMin}-${s.currentSalaryMax} LPA`}
          >
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">Minimum (LPA)</p>
                <Slider
                  value={[s.currentSalaryMin]}
                  min={0}
                  max={120}
                  step={1}
                  onValueChange={(v) => {
                    const min = v[0];
                    set("currentSalaryMin", min);
                    if (min > s.currentSalaryMax) set("currentSalaryMax", min);
                  }}
                />
              </div>
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">Maximum (LPA)</p>
                <Slider
                  value={[s.currentSalaryMax]}
                  min={s.currentSalaryMin}
                  max={120}
                  step={1}
                  onValueChange={(v) => set("currentSalaryMax", v[0])}
                />
              </div>
              {s.currentSalaryMin > s.currentSalaryMax && (
                <p className="text-xs text-destructive">Minimum cannot exceed maximum</p>
              )}
            </div>
          </FieldRow>

          <FieldRow label="Preferred Job Locations">
            <ChipInput
              values={s.preferredLocations}
              onChange={(v) => set("preferredLocations", v)}
              placeholder="Add preferred location (e.g. Mumbai, Remote)"
            />
          </FieldRow>

          <FieldRow label="Availability Status">
            <Select
              value={s.availabilityStatus}
              onValueChange={(v) => set("availabilityStatus", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Immediate Joiner">Immediate Joiner</SelectItem>
                <SelectItem value="Serving Notice Period">Serving Notice Period</SelectItem>
                <SelectItem value="Open to Opportunities">Open to Opportunities</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      );
    case 12:
      return (
        <FieldRow label="Languages">
          <ChipInput
            values={s.languages}
            onChange={(v) => set("languages", v)}
            placeholder="Add language"
            suggestions={["English", "Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Kannada"]}
          />
        </FieldRow>
      );
    case 13:
      return (
        <FieldRow
          label="Professional summary"
          required
          hint="At least 40 characters; keep it clinical and specific"
        >
          <Textarea
            rows={6}
            value={s.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="Example: Consultant cardiologist with 7 years of tertiary-care experience across cath lab, CCU and OPD. Skilled in..."
          />
        </FieldRow>
      );
    case 14:
      return (
        <div className="space-y-6">
          <OptionGrid
            label="Verification-ready documents"
            options={DOCUMENT_OPTIONS}
            values={s.documentChecklist}
            onChange={(v) => set("documentChecklist", v)}
          />
          <FileUploadZone
            files={s.documents}
            onChange={(v) => set("documents", v)}
            multiple={!isJobMode}
            title={
              isJobMode
                ? "Attach a CV or supporting document for this job"
                : "Optional: keep supporting files ready for applications"
            }
            hint="PDF or Word (.pdf, .doc, .docx), up to 5MB each"
          />
        </div>
      );
    case 15:
      return (
        <div className="space-y-3">
          {isJobMode && jobCustomFields.length > 0 && (
            <JobCustomFieldsForm
              fields={jobCustomFields}
              values={customResponses}
              onChange={setCustomResponses}
            />
          )}
          <ReviewRow label="Name" value={s.fullName} />
          <ReviewRow
            label="Role"
            value={[s.grade, s.specialty, `${s.yearsExperience} yrs`].filter(Boolean).join(" · ")}
          />
          <ReviewRow
            label="Registration"
            value={
              s.registrationNumber
                ? `${s.registrationNumber} (${s.registrationCouncil || "Council not set"}) · ${s.licenseStatus}`
                : ""
            }
          />
          <ReviewRow label="Qualifications" value={`${s.qualifications.length} entries`} />
          <ReviewRow label="Experience" value={`${s.experience.length} positions`} />
          <ReviewRow
            label="Procedures"
            value={s.procedures.map((p) => `${p.name} (${p.count})`).join(", ")}
          />
          <ReviewRow
            label="Research"
            value={`${s.publicationDetails.length + s.publications.length} publications · ${s.totalCitations || 0} citations`}
          />
          <ReviewRow label="Highlights" value={`${s.professionalHighlights.length} entries`} />
          <ReviewRow
            label="Salary expectation"
            value={`₹${s.expectedSalaryMin}-${s.expectedSalaryMax} LPA`}
          />
          <ReviewRow label="Documents" value={s.documentChecklist.join(", ")} />
          {isJobMode && (
            <ReviewRow
              label="Job attachment"
              value={s.documents.map((d) => d.name).join(", ") || "None"}
            />
          )}
          {isJobMode &&
            jobCustomFields.map((f) => (
              <ReviewRow
                key={f.id}
                label={f.label}
                value={formatResponseValue(customResponses[f.id])}
              />
            ))}
        </div>
      );
    default:
      return null;
  }
}

function SignalPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{value || "Not set"}</p>
    </div>
  );
}

function OptionGrid({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const checked = values.includes(option);
          return (
            <label
              key={option}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-sm transition-colors",
                checked && "border-brand bg-brand-soft text-primary",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => onChange(toggleListValue(values, option, Boolean(v)))}
              />
              <span className="leading-snug">{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-surface px-4 py-3 text-sm sm:grid-cols-[180px_1fr]">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="break-words text-foreground">{value || "—"}</p>
    </div>
  );
}

function Repeater<T>({
  items,
  onChange,
  empty,
  render,
  addLabel,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  empty: T;
  render: (item: T, i: number, update: (i: number, v: T) => void) => ReactNode;
  addLabel: string;
}) {
  const update = (i: number, v: T) => onChange(items.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="relative rounded-xl border bg-surface p-4">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {render(item, i, update)}
        </div>
      ))}
      <Button variant="outline" type="button" onClick={() => onChange([...items, empty])}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

function toggleListValue(values: string[], value: string, checked: boolean) {
  if (checked && !values.includes(value)) return [...values, value];
  if (!checked) return values.filter((v) => v !== value);
  return values;
}

function formatPublicationDetail(p: PublicationDetail): string {
  const venue = [p.journal, p.year].filter(Boolean).join(" ");
  const doi = p.doi ? ` DOI/PMID: ${p.doi}` : "";
  return [p.authors, p.title, venue].filter(Boolean).join(". ") + doi;
}

function computeDoctorReadiness(s: FormState) {
  const checks = [
    { label: "Add contact details", done: Boolean(s.fullName && s.email && s.phone) },
    { label: "Select specialty and grade", done: Boolean(s.specialty && s.grade) },
    {
      label: "Add active registration details",
      done: Boolean(s.registrationNumber && s.registrationCouncil && s.licenseStatus),
    },
    { label: "Add at least one qualification", done: s.qualifications.length > 0 },
    { label: "Add structured clinical experience", done: s.experience.length > 0 },
    { label: "Add clinical skills", done: s.clinicalSkills.length > 0 },
    { label: "Add procedure exposure", done: s.procedures.length > 0 },
    {
      label: "Add publications or citation metrics",
      done:
        s.publicationDetails.length > 0 || s.publications.length > 0 || Boolean(s.totalCitations),
    },
    { label: "Mark verification documents ready", done: s.documentChecklist.length > 0 },
    { label: "Write a professional summary", done: s.summary.trim().length >= 40 },
  ];
  const score = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  return {
    score,
    missing: checks
      .filter((c) => !c.done)
      .slice(0, 3)
      .map((c) => c.label),
  };
}
