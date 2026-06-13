import {
  Award,
  BookOpen,
  CalendarClock,
  FileCheck2,
  Globe2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Briefcase,
} from "lucide-react";
import type { ReactNode } from "react";
import type { FormProfile } from "@/lib/formProfile";

function formatLPA(min: number, max: number) {
  if (min <= 0 && max <= 0) return "—";
  if (min === max) return `${min} LPA`;
  return `${min}-${max} LPA`;
}

/** Same premium layout as candidate portal generated CV. */
export function CvDocument({
  profile: c,
  id,
  className = "",
}: {
  profile: FormProfile;
  id?: string;
  className?: string;
}) {
  const locationLabel = c.state || c.city;
  const publications = getPublications(c);
  const totalCitations = getCitationTotal(c, publications);
  const procedureVolume = (c.procedures ?? []).reduce((sum, p) => sum + Number(p.count || 0), 0);
  const titleLine = [c.grade, c.specialty || c.role].filter(Boolean).join(" · ") || c.headline;

  return (
    <div id={id} className={`overflow-hidden rounded-2xl border bg-card shadow-soft ${className}`}>
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,oklch(0.19_0.045_265),oklch(0.29_0.07_260)_55%,oklch(0.55_0.18_262))] px-8 py-8 text-primary-foreground">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-warning" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium ring-1 ring-white/15">
              <Stethoscope className="h-3 w-3" /> Doctor CV
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">{c.name}</h2>
            <p className="mt-1 text-sm opacity-90">{titleLine}</p>
            {c.summary && (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed opacity-85">{c.summary}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs opacity-90">
              {c.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {c.email}
                </span>
              )}
              {c.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {c.phone}
                </span>
              )}
              {locationLabel && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {locationLabel}
                </span>
              )}
            </div>
          </div>
          <div className="min-w-[220px] space-y-2 rounded-2xl bg-white/10 p-4 text-xs ring-1 ring-white/15">
            <CredentialLine label="Registration" value={c.registrationNumber} />
            <CredentialLine label="Council" value={c.registrationCouncil} />
            <CredentialLine label="License" value={c.licenseStatus} />
            {c.specialistRegisterStatus && (
              <CredentialLine label="Specialist" value={c.specialistRegisterStatus} />
            )}
          </div>
        </div>
      </div>

      <div className="grid border-b bg-muted/30 px-8 py-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Experience" value={`${c.yearsExperience || 0}+ yrs`} />
        <Metric
          label="Procedure volume"
          value={procedureVolume ? `${procedureVolume}+` : `${c.procedures.length}`}
        />
        <Metric label="Publications" value={`${publications.length}`} />
        <Metric label="Citations" value={totalCitations || "0"} />
      </div>

      <div className="grid gap-8 p-8 lg:grid-cols-[1.4fr_0.6fr]">
        <main className="space-y-8">
          {c.experience.length > 0 && (
            <CVSection
              title="Clinical Experience"
              icon={<Briefcase className="h-4 w-4" />}
              prominent
            >
              <div className="space-y-4">
                {c.experience.map((e, i) => (
                  <article
                    key={i}
                    className="relative overflow-hidden rounded-xl border bg-background p-4 shadow-soft"
                  >
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                    <div className="pl-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{e.role}</p>
                          <p className="mt-0.5 text-sm font-medium text-primary">
                            {e.hospital}
                            {e.city ? ` · ${e.city}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-primary">
                          {formatPeriod(e.start, e.end, e.current)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[e.specialty, e.hospitalType, e.department, e.patientLoad, e.rota]
                          .filter(Boolean)
                          .map((item) => (
                            <span
                              key={item}
                              className="rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] text-foreground/75"
                            >
                              {item}
                            </span>
                          ))}
                      </div>
                      {e.summary && (
                        <p className="mt-3 text-sm leading-relaxed text-foreground/75">
                          {e.summary}
                        </p>
                      )}
                      {e.keyProcedures && e.keyProcedures.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {e.keyProcedures.map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </CVSection>
          )}

          {publications.length > 0 && (
            <CVSection
              title="Publications & Citations"
              icon={<BookOpen className="h-4 w-4" />}
              prominent
            >
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <ResearchStat label="Total citations" value={totalCitations || "0"} />
                <ResearchStat label="h-index" value={c.hIndex || "—"} />
                <ResearchStat label="i10-index" value={c.i10Index || "—"} />
              </div>
              <div className="space-y-3">
                {publications.map((p, i) => (
                  <article
                    key={`${p.title}-${i}`}
                    className="rounded-xl border bg-background px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {p.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {p.meta}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-primary">
                        {p.citations} cites
                      </span>
                    </div>
                    {p.doi && (
                      <p className="mt-2 text-[11px] text-foreground/65">DOI/PMID: {p.doi}</p>
                    )}
                  </article>
                ))}
              </div>
              {(c.scholarUrl || c.orcid) && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {c.scholarUrl && <span>Scholar: {c.scholarUrl}</span>}
                  {c.orcid && <span>ORCID: {c.orcid}</span>}
                </div>
              )}
            </CVSection>
          )}

          {c.procedures.length > 0 && (
            <CVSection title="Procedure Exposure" icon={<Stethoscope className="h-4 w-4" />}>
              <div className="grid gap-2 sm:grid-cols-2">
                {c.procedures.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-foreground">{p.name}</p>
                    <span className="text-xs font-semibold text-primary">{p.count}</span>
                  </div>
                ))}
              </div>
            </CVSection>
          )}

          {c.professionalHighlights && c.professionalHighlights.length > 0 && (
            <CVSection title="Audit, Teaching & Leadership" icon={<Award className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {c.professionalHighlights.map((h, i) => (
                  <article
                    key={`${h.title}-${i}`}
                    className="rounded-xl border bg-background px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {h.category}
                      </span>
                      {h.year && (
                        <span className="text-[11px] text-muted-foreground">{h.year}</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{h.title}</p>
                    {h.detail && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {h.detail}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </CVSection>
          )}
        </main>

        <SidebarColumn profile={c} />
      </div>
    </div>
  );
}

function SidebarColumn({ profile: c }: { profile: FormProfile }) {
  return (
    <aside className="space-y-6 border-l pl-6">
      {(c.verified || c.registrationNumber || c.registrationCouncil) && (
        <CVSection title="Registration" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="space-y-2 rounded-xl border bg-background p-3 text-xs">
            <CredentialLine label="Number" value={c.registrationNumber} dark />
            <CredentialLine label="Council" value={c.registrationCouncil} dark />
            <CredentialLine label="Status" value={c.licenseStatus} dark />
            <CredentialLine label="Renewal" value={formatDate(c.revalidationDate)} dark />
            <CredentialLine label="Indemnity" value={c.indemnityProvider} dark />
            <CredentialLine label="Work status" value={c.rightToWork} dark />
          </div>
        </CVSection>
      )}
      {c.qualifications.length > 0 && (
        <CVSection title="Education" icon={<GraduationCap className="h-4 w-4" />}>
          <div className="space-y-3">
            {c.qualifications.map((q, i) => (
              <div key={i} className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{q.degree}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{q.institution}</p>
                <p className="text-[11px] text-muted-foreground">{q.year}</p>
              </div>
            ))}
          </div>
        </CVSection>
      )}
      {c.clinicalSkills.length > 0 && (
        <CVSection title="Clinical Skills" icon={<Sparkles className="h-4 w-4" />}>
          <ChipList items={c.clinicalSkills} brand />
        </CVSection>
      )}
      {c.certifications.length > 0 && (
        <CVSection title="Certifications" icon={<FileCheck2 className="h-4 w-4" />}>
          <ul className="space-y-2 text-xs">
            {c.certifications.map((cert, i) => (
              <li key={i} className="rounded-lg border bg-background px-3 py-2">
                <span className="font-semibold text-foreground">{cert.name}</span>
                {cert.issuer && <span className="text-muted-foreground"> · {cert.issuer}</span>}
                {cert.year && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{cert.year}</p>
                )}
              </li>
            ))}
          </ul>
        </CVSection>
      )}
      {c.technicalSkills.length > 0 && (
        <CVSection title="Systems" icon={<FileCheck2 className="h-4 w-4" />}>
          <ChipList items={c.technicalSkills} />
        </CVSection>
      )}
      {c.languages.length > 0 && (
        <CVSection title="Languages" icon={<Globe2 className="h-4 w-4" />}>
          <ChipList items={c.languages} />
        </CVSection>
      )}
      <CVSection title="Availability" icon={<CalendarClock className="h-4 w-4" />}>
        <p className="text-xs font-medium text-foreground">{c.availability}</p>
        {(c.expectedSalaryMin > 0 || c.expectedSalaryMax > 0) && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Expected: {formatLPA(c.expectedSalaryMin, c.expectedSalaryMax)}
          </p>
        )}
        {c.preferredRoleTypes && c.preferredRoleTypes.length > 0 && (
          <div className="mt-2">
            <ChipList items={c.preferredRoleTypes} />
          </div>
        )}
      </CVSection>
    </aside>
  );
}

function ChipList({ items, brand }: { items: string[]; brand?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className={
            brand
              ? "rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-primary"
              : "rounded-full border bg-background px-2.5 py-1 text-[10px] text-foreground/80"
          }
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function CVSection({
  title,
  icon,
  children,
  prominent,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  prominent?: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={
            prominent
              ? "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              : "flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-primary"
          }
        >
          {icon}
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b px-4 py-3 sm:border-b-0 sm:border-r last:border-r-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ResearchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}

function CredentialLine({ label, value, dark }: { label: string; value?: string; dark?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={dark ? "text-muted-foreground" : "opacity-70"}>{label}</span>
      <span className={dark ? "text-right font-medium text-foreground" : "text-right font-medium"}>
        {value}
      </span>
    </div>
  );
}

type DisplayPublication = {
  title: string;
  meta: string;
  doi: string;
  citations: number;
};

function getPublications(c: FormProfile): DisplayPublication[] {
  const detailed = (c.publicationDetails ?? [])
    .filter((p) => p.title || p.journal || p.authors)
    .map((p) => ({
      title: p.title || "Untitled publication",
      meta: [p.authors, [p.journal, p.year].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
      doi: p.doi,
      citations: Number(p.citations || 0),
    }));
  if (detailed.length > 0) return detailed;
  return (c.publications ?? []).map((p) => ({
    title: p,
    meta: "Publication",
    doi: "",
    citations: 0,
  }));
}

function getCitationTotal(c: FormProfile, publications: DisplayPublication[]) {
  if (c.totalCitations) return c.totalCitations;
  const sum = publications.reduce((total, p) => total + p.citations, 0);
  return sum ? String(sum) : "";
}

function formatPeriod(start: string, end: string, current?: boolean) {
  return [formatDate(start), current ? "Present" : formatDate(end)].filter(Boolean).join(" - ");
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
