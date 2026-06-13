import { z } from "zod";
import { parseISO, isValid, isAfter, isBefore, startOfDay } from "date-fns";
import type { RoleType } from "@/data/categories";

export function validateLinkedInUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!parsed.hostname.toLowerCase().includes("linkedin.com")) {
      return "Enter a valid LinkedIn profile URL (linkedin.com)";
    }
    return null;
  } catch {
    return "Enter a valid LinkedIn profile URL";
  }
}

export type WizardFormState = {
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  city: string;
  state: string;
  role: string;
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
  qualifications: { degree: string; institution: string; year: string }[];
  experience: {
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
  }[];
  clinicalSkills: string[];
  technicalSkills: string[];
  summary: string;
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  currentSalaryMin: number;
  currentSalaryMax: number;
  preferredLocations: string[];
  availabilityStatus: string;
  procedures: { name: string; count: number }[];
  certifications: { name: string; issuer: string; year: string }[];
  publications: string[];
  publicationDetails: {
    title: string;
    authors: string;
    journal: string;
    year: string;
    doi: string;
    citations: number;
  }[];
  totalCitations: string;
  hIndex: string;
  i10Index: string;
  scholarUrl: string;
  orcid: string;
  professionalHighlights: { category: string; title: string; detail: string; year: string }[];
  languages: string[];
  availability: string;
  documentChecklist: string[];
};

const emailSchema = z.string().email("Enter a valid email");
const phoneSchema = z
  .string()
  .min(10, "Enter a valid 10-digit phone number")
  .max(15, "Phone number is too long")
  .regex(/^[\d\s+\-()]+$/, "Phone number can only contain digits and + - ( )");

const today = startOfDay(new Date());

function parseIsoDate(value: string): Date | null {
  if (!value?.trim()) return null;
  const d = parseISO(value);
  return isValid(d) ? startOfDay(d) : null;
}

function compareDates(start: string, end: string, endIsCurrent: boolean): string | null {
  const startD = parseIsoDate(start);
  if (!start) return "Start date is required";
  if (!startD) return "Enter a valid start date";
  if (isAfter(startD, today)) return "Start date cannot be in the future";
  if (endIsCurrent || !end.trim()) return null;
  const endD = parseIsoDate(end);
  if (!endD) return "Enter a valid end date, or mark as current role";
  if (isBefore(endD, startD)) return "End date cannot be before start date";
  if (isAfter(endD, today)) return "End date cannot be in the future";
  return null;
}

export function validateWizardStep(step: number, s: WizardFormState): string | null {
  switch (step) {
    case 0: {
      if (!s.fullName.trim()) return "Full name is required";
      const email = emailSchema.safeParse(s.email.trim());
      if (!email.success) return email.error.errors[0]?.message ?? "Invalid email";
      const phone = phoneSchema.safeParse(s.phone.trim());
      if (!phone.success) return phone.error.errors[0]?.message ?? "Invalid phone";
      if (!s.state.trim()) return "Please select your state";
      const linkedinErr = validateLinkedInUrl(s.linkedinUrl);
      if (linkedinErr) return linkedinErr;
      return null;
    }
    case 1: {
      if (!s.role) return "Role is required";
      if (Number.isNaN(s.yearsExperience) || s.yearsExperience < 0) {
        return "Years of experience must be 0 or more";
      }
      if (s.yearsExperience > 60) return "Years of experience seems too high — check the value";
      const role = s.role as RoleType;
      if (role === "Doctor") {
        if (!s.specialty.trim()) return "Primary specialty is required";
        if (!s.grade.trim()) return "Current grade is required";
      }
      if (role === "Dentist" && !s.specialty.trim()) {
        return "Primary specialty is required";
      }
      return null;
    }
    case 2: {
      const role = s.role as RoleType;
      if (role === "Doctor" || role === "Dentist") {
        if (!s.registrationCouncil.trim()) return "Registration council is required";
        if (!s.registrationNumber.trim()) return "Registration number is required";
      }
      if (role === "Nurse" && !s.registrationNumber.trim()) {
        return "INC registration number is required";
      }
      if ((role === "Doctor" || role === "Dentist") && !s.licenseStatus.trim()) {
        return "License status is required";
      }
      return null;
    }
    case 3: {
      if (s.qualifications.length === 0) return "Add at least one qualification";
      for (let i = 0; i < s.qualifications.length; i++) {
        const q = s.qualifications[i];
        if (!q.degree.trim()) return `Qualification ${i + 1}: degree is required`;
        if (!q.institution.trim()) return `Qualification ${i + 1}: institution is required`;
        const year = q.year.trim();
        if (!year) return `Qualification ${i + 1}: year is required`;
        const y = Number(year);
        if (!/^\d{4}$/.test(year) || Number.isNaN(y) || y < 1950 || y > new Date().getFullYear()) {
          return `Qualification ${i + 1}: enter a valid 4-digit year`;
        }
      }
      return null;
    }
    case 4: {
      if (s.experience.length === 0) return "Add at least one work experience";
      for (let i = 0; i < s.experience.length; i++) {
        const ex = s.experience[i];
        if (!ex.role.trim()) return `Experience ${i + 1}: role is required`;
        if (!ex.hospital.trim()) return `Experience ${i + 1}: hospital is required`;
        if (!ex.city.trim()) return `Experience ${i + 1}: city is required`;
        const dateErr = compareDates(ex.start, ex.end, Boolean(ex.current));
        if (dateErr) return `Experience ${i + 1}: ${dateErr}`;
        if (s.role === "Doctor" && !ex.specialty?.trim()) {
          return `Experience ${i + 1}: specialty or department focus is required`;
        }
      }
      return null;
    }
    case 5:
      if (s.clinicalSkills.length === 0) return "Add at least one clinical skill";
      return null;
    case 6: {
      for (let i = 0; i < s.procedures.length; i++) {
        const p = s.procedures[i];
        if (p.name.trim() && (Number.isNaN(p.count) || p.count < 0)) {
          return `Procedure ${i + 1}: count must be 0 or more`;
        }
        if (!p.name.trim() && p.count > 0) {
          return `Procedure ${i + 1}: enter a procedure name`;
        }
      }
      return null;
    }
    case 7: {
      for (let i = 0; i < s.publicationDetails.length; i++) {
        const p = s.publicationDetails[i];
        const hasAny = Boolean(
          p.title.trim() || p.authors.trim() || p.journal.trim() || p.year.trim() || p.doi.trim(),
        );
        if (!hasAny && !p.citations) continue;
        if (!p.title.trim()) return `Publication ${i + 1}: title is required`;
        if (!p.journal.trim()) return `Publication ${i + 1}: journal or venue is required`;
        if (p.year.trim()) {
          const y = Number(p.year.trim());
          if (
            !/^\d{4}$/.test(p.year.trim()) ||
            Number.isNaN(y) ||
            y < 1950 ||
            y > new Date().getFullYear() + 1
          ) {
            return `Publication ${i + 1}: enter a valid publication year`;
          }
        }
        if (Number.isNaN(p.citations) || p.citations < 0) {
          return `Publication ${i + 1}: citations must be 0 or more`;
        }
      }
      for (const [label, value] of [
        ["Total citations", s.totalCitations],
        ["h-index", s.hIndex],
        ["i10-index", s.i10Index],
      ]) {
        if (value.trim() && (!/^\d+$/.test(value.trim()) || Number(value) < 0)) {
          return `${label} must be a whole number`;
        }
      }
      return null;
    }
    case 8: {
      for (let i = 0; i < s.professionalHighlights.length; i++) {
        const h = s.professionalHighlights[i];
        const hasAny = Boolean(h.title.trim() || h.detail.trim() || h.year.trim());
        if (!hasAny) continue;
        if (!h.title.trim()) return `Highlight ${i + 1}: title is required`;
        if (!h.category.trim()) return `Highlight ${i + 1}: category is required`;
      }
      return null;
    }
    case 11: {
      if (s.expectedSalaryMin < 0 || s.expectedSalaryMax < 0) {
        return "Expected salary cannot be negative";
      }
      if (s.expectedSalaryMin > s.expectedSalaryMax) {
        return "Minimum expected salary cannot exceed maximum";
      }
      if (s.currentSalaryMin < 0 || s.currentSalaryMax < 0) {
        return "Current salary cannot be negative";
      }
      if (s.currentSalaryMin > s.currentSalaryMax) {
        return "Minimum current salary cannot exceed maximum";
      }
      return null;
    }
    case 13:
      if (!s.summary.trim()) return "Professional summary is required";
      if (s.summary.trim().length < 40) {
        return "Professional summary should be at least 40 characters";
      }
      return null;
    default:
      return null;
  }
}

export const authSignInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const authSignUpSchema = authSignInSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobile: phoneSchema,
});

export const uploadApplySchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: phoneSchema,
});
