import {
  Stethoscope,
  Bluetooth as Tooth,
  HeartPulse,
  Wrench,
  Building2,
  GraduationCap,
  Clock,
  type LucideIcon,
} from "lucide-react";

export type Specialty = {
  id: string;
  label: string;
};

export type Category = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  specialties?: Specialty[];
};

/**
 * Single source of truth for categories + specialties.
 * Add a new entry here to surface a new category across the app.
 */
export const CATEGORIES: Category[] = [
  {
    id: "doctors",
    label: "Doctors",
    icon: Stethoscope,
    description: "Consultants, residents, fellows",
    specialties: [
      { id: "general-physician", label: "General Physician" },
      { id: "radiology", label: "Radiology" },
      { id: "cardiology", label: "Cardiology" },
      { id: "orthopedics", label: "Orthopedics" },
      { id: "pediatrics", label: "Pediatrics" },
      { id: "neurology", label: "Neurology" },
    ],
  },
  {
    id: "dentists",
    label: "Dentists",
    icon: Tooth,
    description: "Surgeons & specialists",
    specialties: [
      { id: "dental-surgeon", label: "Dental Surgeon" },
      { id: "endodontics", label: "Endodontics" },
      { id: "orthodontics", label: "Orthodontics" },
      { id: "prosthodontics", label: "Prosthodontics" },
    ],
  },
  {
    id: "nurses",
    label: "Nurses",
    icon: HeartPulse,
    description: "ICU, OT, ward & home care",
  },
  {
    id: "technicians",
    label: "Technicians",
    icon: Wrench,
    description: "Lab, radiology, OT tech",
  },
  {
    id: "admin",
    label: "Admin / Hospital Ops",
    icon: Building2,
    description: "Operations, billing, HR",
  },
  {
    id: "internships",
    label: "Internships / Observership",
    icon: GraduationCap,
    description: "Early-career programs",
  },
  {
    id: "locum",
    label: "Locum / Temporary",
    icon: Clock,
    description: "Short-term & on-call shifts",
  },
];

export const ROLE_TYPES = [
  "Students, Interns, Residents & Trainees",
  "Clinical Practitioners & Super Specialists (MBBS/ MD Physician/ MD/MS / DM / MCh / DNB-SS etc)",
  "Dentist and Super specialists (BDS/MDS)",
  "Clinical Practioners (BHMS/BAMS/BUMS)-  AYUSH & Alternative Medicine",
  "Veterinary Practitioners and Specialist",
  "Nursing Professionals & Paramedics",
  "Biotechnologist, Genetics & Life Sciences speclist",
  "Physiotherapy and Rehabilitation Professionals",
  "Laboratory Technologist & Diagnostic Services",
  "Pharmacy & Pharmaceutical Professionals",
  "Hospital Administration & Management",
  "Dietician , Nutritionist and Wellness advisor",
  "Medical Education & Faculty (BSC/MSC/PHD)",
  "Clinical Research & Healthcare Research",
  "Pharmaceutical, Medical Devices & Healthcare Industry",
  "Emergency Medical Services (EMS)",
  "Public Health care workers",
  "Non-Clinical Healthcare Support Staff"
] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export const isDoctor = (role?: string) =>
  String(role || "").includes("Clinical Practitioners & Super Specialists");

export const isDentist = (role?: string) =>
  String(role || "").includes("Dentist and Super specialists");

export const isNurse = (role?: string) =>
  String(role || "").includes("Nursing Professionals & Paramedics");
