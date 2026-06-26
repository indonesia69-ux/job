import { type RoleType } from "./categories";

export type Qualification = {
  degree: string;
  institution: string;
  year: string;
};


export type ExperienceItem = {
  role: string;
  hospital: string;
  city: string;
  start: string;
  end: string;
  summary: string;
  current?: boolean;
  specialty?: string;
  hospitalType?: string;
  department?: string;
  patientLoad?: string;
  rota?: string;
  keyProcedures?: string[];
};

export type Procedure = {
  name: string;
  count: number;
};

export type Certification = {
  name: string;
  issuer: string;
  year: string;
};

export type PublicationDetail = {
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
  citations: number;
};

export type ProfessionalHighlight = {
  category: "Audit / QI" | "Teaching" | "Leadership" | "Award";
  title: string;
  detail: string;
  year: string;
};

export type Profile = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  avatar: string;
  verified: boolean;
  completeness: number; // 0-100
  role: RoleType | "";
  registrationNumber: string;
  registrationCouncil: string;
  specialty: string;
  grade: string;
  preferredRoleTypes: string[];
  licenseStatus: string;
  specialistRegisterStatus: string;
  revalidationDate: string;
  indemnityProvider: string;
  rightToWork: string;
  visaStatus: string;
  yearsExperience: number;
  summary: string;
  qualifications: Qualification[];
  experience: ExperienceItem[];
  clinicalSkills: string[];
  technicalSkills: string[];
  procedures: Procedure[];
  certifications: Certification[];
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
  linkedinUrl: string;
  documentChecklist: string[];
  cvUrl?: string;
  uploadedCvName?: string;
  uploadedCvData?: string;
  cvSource?: string;
  supportingDocuments?: { name: string; url: string; publicId: string; mime: string }[];
};

/**
 * Sample profile — used purely as form pre-fill / demo seeding when the
 * candidate clicks "Use sample data". The real CV in the portal is built
 * from the form (see `src/store/profileStore.ts`).
 */
export const SAMPLE_PROFILE: Profile = {
  name: "Dr. Ananya Sengupta",
  headline: "Consultant Cardiologist · 7 years experience",
  email: "ananya.sengupta@apronhanger.in",
  phone: "+91 98300 12345",
  city: "Kolkata, West Bengal",
  state: "West Bengal",
  avatar: "AS",
  verified: true,
  completeness: 82,
  role: "Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)",
  registrationNumber: "WBMC/2017/45821",
  registrationCouncil: "West Bengal Medical Council",
  specialty: "Cardiology",
  grade: "Consultant",
  preferredRoleTypes: ["Full-time", "Visiting consultant", "Academic / teaching"],
  licenseStatus: "Active",
  specialistRegisterStatus: "Specialist registered",
  revalidationDate: "2027-06-30",
  indemnityProvider: "IMA Professional Protection Scheme",
  rightToWork: "Indian citizen",
  visaStatus: "Not applicable",
  yearsExperience: 7,
  summary:
    "DM Cardiology with 7 years of clinical practice across tertiary care hospitals in eastern India. Strong interventional skills (PTCA, pacemaker implantation), peer-reviewed publications in heart failure management, and a keen interest in preventive cardiology.",
  qualifications: [
    { degree: "DM Cardiology", institution: "PGIMER, Chandigarh", year: "2019" },
    { degree: "MD Internal Medicine", institution: "IPGMER, Kolkata", year: "2016" },
    { degree: "MBBS", institution: "Calcutta Medical College", year: "2012" },
  ],
  experience: [
    {
      role: "Consultant Cardiologist",
      hospital: "AMRI Hospitals",
      city: "Kolkata",
      start: "2021-08-01",
      end: "",
      current: true,
      specialty: "Interventional Cardiology",
      hospitalType: "Tertiary care hospital",
      department: "Cath lab, CCU and OPD",
      patientLoad: "35-45 OPD patients/day; 12-bed CCU oversight",
      rota: "Interventional on-call and emergency STEMI rota",
      keyProcedures: ["Coronary angiography", "PTCA", "Pacemaker implantation"],
      summary:
        "Lead interventional cardiology service with responsibility for cath lab governance, CCU escalation and high-risk cardiac procedures.",
    },
    {
      role: "Senior Resident — Cardiology",
      hospital: "PGIMER",
      city: "Chandigarh",
      start: "2019-07-01",
      end: "2021-07-31",
      specialty: "Cardiology",
      hospitalType: "Academic medical institute",
      department: "Cath lab, CCU, inpatient and OPD",
      patientLoad: "Managed CCU rounds and daily cardiology OPD",
      rota: "Senior resident emergency and CCU rota",
      keyProcedures: ["Echocardiography", "Temporary pacing", "Coronary angiography"],
      summary:
        "Completed intensive cath lab and CCU training while publishing peer-reviewed work in heart failure.",
    },
  ],
  clinicalSkills: [
    "Coronary Angiography",
    "PTCA",
    "Pacemaker Implantation",
    "Echocardiography",
    "Heart Failure Management",
    "Preventive Cardiology",
  ],
  technicalSkills: ["EPIC EMR", "Philips Cath Lab", "GE Echo", "Stata", "R"],
  procedures: [
    { name: "Diagnostic Coronary Angiography", count: 850 },
    { name: "PTCA / Stent", count: 220 },
    { name: "Permanent Pacemaker", count: 65 },
    { name: "Echocardiography", count: 1400 },
  ],
  certifications: [
    { name: "ACLS Provider", issuer: "American Heart Association", year: "2024" },
    { name: "BLS Instructor", issuer: "American Heart Association", year: "2023" },
    { name: "Diploma in Echocardiography", issuer: "ICC", year: "2020" },
  ],
  publications: [
    "Sengupta A. et al. Outcomes of primary PCI in eastern India — Indian Heart Journal 2023.",
    "Sengupta A., Roy K. Heart failure registry — JAPI 2022.",
  ],
  publicationDetails: [
    {
      title: "Outcomes of primary PCI in eastern India",
      authors: "Sengupta A., Roy K., Banerjee S.",
      journal: "Indian Heart Journal",
      year: "2023",
      doi: "10.1016/j.ihj.2023.04.021",
      citations: 18,
    },
    {
      title: "Heart failure registry outcomes from a tertiary care cohort",
      authors: "Sengupta A., Roy K.",
      journal: "Journal of the Association of Physicians of India",
      year: "2022",
      doi: "",
      citations: 11,
    },
  ],
  totalCitations: "74",
  hIndex: "5",
  i10Index: "3",
  scholarUrl: "https://scholar.google.com",
  orcid: "0000-0002-1234-5678",
  professionalHighlights: [
    {
      category: "Audit / QI",
      title: "Door-to-balloon time improvement",
      detail:
        "Reduced median STEMI door-to-balloon time by 18 minutes through cath lab escalation redesign.",
      year: "2023",
    },
    {
      category: "Teaching",
      title: "Cardiology teaching lead",
      detail: "Designed weekly ECG and echo interpretation sessions for junior residents.",
      year: "2022",
    },
  ],
  languages: ["English", "Bengali", "Hindi"],
  availability: "30 days notice",
  expectedSalaryMin: 32,
  expectedSalaryMax: 48,
  currentSalaryMin: 24,
  currentSalaryMax: 26,
  preferredLocations: ["Kolkata", "Delhi"],
  availabilityStatus: "Serving Notice Period",
  linkedinUrl: "https://www.linkedin.com/in/ananya-sengupta-md",
  documentChecklist: [
    "Medical registration certificate",
    "Postgraduate degree certificates",
    "ACLS/BLS certificate",
    "Right-to-work proof",
  ],
  cvUrl: undefined,
  uploadedCvName: undefined,
  uploadedCvData: undefined,
  cvSource: undefined,
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  avatar: "AH",
  verified: false,
  completeness: 0,
  role: "",
  registrationNumber: "",
  registrationCouncil: "",
  specialty: "",
  grade: "",
  preferredRoleTypes: [],
  licenseStatus: "Active",
  specialistRegisterStatus: "",
  revalidationDate: "",
  indemnityProvider: "",
  rightToWork: "",
  visaStatus: "",
  yearsExperience: 0,
  summary: "",
  qualifications: [],
  experience: [],
  clinicalSkills: [],
  technicalSkills: [],
  procedures: [],
  certifications: [],
  publications: [],
  publicationDetails: [],
  totalCitations: "",
  hIndex: "",
  i10Index: "",
  scholarUrl: "",
  orcid: "",
  professionalHighlights: [],
  languages: [],
  availability: "30 days notice",
  expectedSalaryMin: 0,
  expectedSalaryMax: 0,
  currentSalaryMin: 0,
  currentSalaryMax: 0,
  preferredLocations: [],
  availabilityStatus: "",
  linkedinUrl: "",
  documentChecklist: [],
  cvUrl: undefined,
  uploadedCvName: undefined,
  uploadedCvData: undefined,
  cvSource: undefined,
};

/**
 * Back-compat alias. Components that haven't migrated to the store yet
 * may still import `CANDIDATE`; treat it as the sample profile.
 * @deprecated Prefer `useProfile()` from `@/store/profileStore`.
 */
export const CANDIDATE = SAMPLE_PROFILE;

export function computeCompleteness(p: Profile): number {
  const checks = [
    !!p.name,
    !!p.email,
    !!p.phone,
    !!(p.state || p.city),
    !!p.registrationNumber,
    !!p.specialty,
    !!p.grade,
    !!p.licenseStatus,
    !!p.summary,
    p.qualifications.length > 0,
    p.experience.length > 0,
    p.clinicalSkills.length > 0,
    p.procedures.length > 0,
    p.certifications.length > 0,
    (p.publicationDetails?.length ?? 0) > 0 || p.publications.length > 0,
    p.documentChecklist.length > 0,
    p.languages.length > 0,
  ];
  const score = checks.filter(Boolean).length / checks.length;
  return Math.round(score * 100);
}

export function deriveHeadline(p: Profile): string {
  if (p.headline) return p.headline;
  const exp = p.yearsExperience ? `${p.yearsExperience} years experience` : "";
  const clinicalTitle = [p.grade, p.specialty || p.experience[0]?.specialty || p.role]
    .filter(Boolean)
    .join(" ");
  const role = clinicalTitle || p.experience[0]?.role || p.role;
  return [role, exp].filter(Boolean).join(" · ");
}

export function initialsFor(name: string): string {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? "A";
  const last = parts[parts.length - 1]?.[0] ?? "H";
  return (first + last).toUpperCase();
}
