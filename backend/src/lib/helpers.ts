import jwt from 'jsonwebtoken';
import prisma from './prisma';

// ─── JSON helpers ────────────────────────────────────────────────────────────

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ─── Hospital helpers ────────────────────────────────────────────────────────

export function isHospitalProfileComplete(h: {
  name?: string | null;
  type?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  return !!(
    h.name?.trim() &&
    h.type?.trim() &&
    h.city?.trim() &&
    h.state?.trim() &&
    h.address?.trim() &&
    h.phone?.trim() &&
    h.email?.trim()
  );
}

export function formatHospital(h: any) {
  return {
    ...h,
    specialties: safeJsonParse(h.specialties, [] as string[]),
    profileComplete: isHospitalProfileComplete(h),
  };
}

export function getHospitalValidity(hospital: { approvedAt?: Date | null; submittedAt?: Date | null }) {
  if (!hospital) return { isLocked: true, daysRemaining: 0 };
  
  const start = hospital.approvedAt || hospital.submittedAt;
  if (!start) return { isLocked: true, daysRemaining: 0 };

  const expirationDate = new Date(start);
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  
  return {
    isLocked: daysRemaining === 0,
    daysRemaining,
  };
}

// ─── Candidate helpers ───────────────────────────────────────────────────────

export const formatCandidate = (c: any) => ({
  ...c,
  skills: safeJsonParse(c.skills, []),
  languages: safeJsonParse(c.languages, []),
  procedures: safeJsonParse(c.procedures, []),
  education: safeJsonParse(c.education, []),
  certifications: safeJsonParse(c.certifications, []),
  experience: safeJsonParse(c.experience, []),
  profile: c.profileJson ? safeJsonParse(c.profileJson, null) : null,
  supportingDocuments: safeJsonParse(c.supportingDocuments, []),
});

export async function syncFormProfile(
  candidateId: string,
  profile: any,
  userEmail: string,
  cvUpload?: { cvUrl?: string; cvCloudinaryId?: string; name?: string; mime?: string },
  supportingDocsUpload?: any[],
) {
  const initials = String(profile.name || 'HP')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const experienceMapped = (profile.experience || []).map((e: any) => ({
    role: e.role,
    hospital: e.hospital,
    city: e.city,
    start: e.start,
    end: e.end,
    summary: e.summary,
    current: Boolean(e.current),
    specialty: e.specialty,
    hospitalType: e.hospitalType,
    department: e.department,
    patientLoad: e.patientLoad,
    rota: e.rota,
    keyProcedures: Array.isArray(e.keyProcedures) ? e.keyProcedures : [],
  }));

  // Build the update data
  const updateData: any = {
    name: String(profile.name || ''),
    initials,
    role: String(profile.role || ''),
    specialty: profile.specialty
      ? String(profile.specialty)
      : profile.clinicalSkills?.[0]
        ? String(profile.clinicalSkills[0])
        : String(profile.role || ''),
    experienceYears: Number(profile.yearsExperience || 0),
    location: String(profile.state || profile.city || ''),
    currentEmployer: profile.experience?.[0]?.hospital ? String(profile.experience[0].hospital) : null,
    summary: String(profile.summary || ''),
    verified: Boolean(profile.verified),
    registration: profile.registrationNumber
      ? `${profile.registrationNumber}${profile.registrationCouncil ? ` (${profile.registrationCouncil})` : ''}`
      : null,
    email: String(profile.email || userEmail),
    phone: profile.phone ? String(profile.phone) : null,
    languages: JSON.stringify(profile.languages || []),
    procedures: JSON.stringify(profile.procedures || []),
    skills: JSON.stringify([...(profile.clinicalSkills || []), ...(profile.technicalSkills || [])]),
    education: JSON.stringify(profile.qualifications || []),
    certifications: JSON.stringify(profile.certifications || []),
    experience: JSON.stringify(experienceMapped),
    matchPercent: Number(profile.completeness || 70),
    profileJson: JSON.stringify(profile),
    cvSource: 'form',
  };

  // Only update Cloudinary CV fields if a new file was uploaded.
  // Do NOT wipe existing cvUrl/cvCloudinaryId when none is provided.
  if (cvUpload?.cvUrl) {
    updateData.cvUrl = cvUpload.cvUrl;
    updateData.cvCloudinaryId = cvUpload.cvCloudinaryId || null;
    if (cvUpload.name) updateData.uploadedCvName = cvUpload.name;
    if (cvUpload.mime) updateData.uploadedCvMime = cvUpload.mime;
    // Clear the legacy base64 fields since we now have a proper Cloudinary URL
    updateData.uploadedCvData = null;
  }

  if (supportingDocsUpload && supportingDocsUpload.length > 0) {
    updateData.supportingDocuments = JSON.stringify(supportingDocsUpload);
  }

  return prisma.candidate.update({
    where: { id: candidateId },
    data: updateData,
  });
}


// ─── Job helpers ─────────────────────────────────────────────────────────────

export function parseJobCustomFields(raw: string | null | undefined): any[] {
  return safeJsonParse(raw, [] as any[]);
}

const CUSTOM_FIELD_TYPES = new Set(['text', 'textarea', 'number', 'select', 'checkbox']);

export function normalizeJobCustomFields(
  raw: unknown,
): { ok: true; fields: any[] } | { ok: false; error: string } {
  if (raw == null) return { ok: true, fields: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'customApplicationFields must be an array' };
  if (raw.length > 30) return { ok: false, error: 'Maximum 30 custom fields per job' };
  const fields: any[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const f = raw[i] as any;
    const label = String(f?.label || '').trim();
    const type = String(f?.type || 'text');
    if (!label) return { ok: false, error: `Custom field ${i + 1}: label is required` };
    if (label.length > 120) return { ok: false, error: `Custom field ${i + 1}: label is too long` };
    if (!CUSTOM_FIELD_TYPES.has(type)) {
      return { ok: false, error: `Custom field ${i + 1}: invalid type` };
    }
    const id = String(f?.id || `field-${i + 1}`).trim();
    if (!id || ids.has(id)) return { ok: false, error: `Custom field ${i + 1}: duplicate or missing id` };
    ids.add(id);
    const options =
      type === 'select'
        ? (Array.isArray(f?.options) ? f.options : [])
            .map((o: unknown) => String(o).trim())
            .filter(Boolean)
            .slice(0, 20)
        : undefined;
    if (type === 'select' && (!options || options.length < 2)) {
      return { ok: false, error: `Custom field "${label}": select needs at least 2 options` };
    }
    fields.push({
      id,
      label,
      type,
      required: Boolean(f?.required),
      placeholder: f?.placeholder ? String(f.placeholder).slice(0, 200) : undefined,
      helpText: f?.helpText ? String(f.helpText).slice(0, 300) : undefined,
      options,
    });
  }
  return { ok: true, fields };
}

export function validateCustomFieldResponses(
  fields: any[],
  responses: unknown,
): { ok: true; normalized: Record<string, string | number | boolean> } | { ok: false; error: string } {
  const normalized: Record<string, string | number | boolean> = {};
  const map =
    responses && typeof responses === 'object' && !Array.isArray(responses)
      ? (responses as Record<string, unknown>)
      : {};
  for (const field of fields) {
    const raw = map[field.id];
    const empty =
      raw === undefined ||
      raw === null ||
      (typeof raw === 'string' && raw.trim() === '');
    if (field.type === 'checkbox') {
      const val = raw === true || raw === 'true' || raw === '1' || raw === 1;
      if (field.required && !val) {
        return { ok: false, error: `"${field.label}" is required` };
      }
      normalized[field.id] = val;
      continue;
    }
    if (empty) {
      if (field.required) return { ok: false, error: `"${field.label}" is required` };
      continue;
    }
    if (field.type === 'number') {
      const n = Number(raw);
      if (Number.isNaN(n)) return { ok: false, error: `"${field.label}" must be a number` };
      normalized[field.id] = n;
      continue;
    }
    const str = String(raw).trim();
    if (field.type === 'select' && field.options && !field.options.includes(str)) {
      return { ok: false, error: `"${field.label}": invalid option` };
    }
    if (str.length > 5000) return { ok: false, error: `"${field.label}" is too long` };
    normalized[field.id] = str;
  }
  return { ok: true, normalized };
}

export function computeJobMatch(job: any, profile: any): number {
  if (!profile) return 0;
  let score = 40;
  const role = String(profile.role || '').toLowerCase();
  const jobRole = String(job.role || '').toLowerCase();
  const jobSpec = String(job.specialty || '').toLowerCase();
  if (role && (jobRole.includes(role) || jobSpec.includes(role))) score += 20;
  const years = Number(profile.yearsExperience || profile.experienceYears || 0);
  const min = Number(job.experienceMin ?? 0);
  const max = Number(job.experienceMax ?? 20);
  if (years >= min && years <= max + 2) score += 20;
  else if (years >= min - 1) score += 10;
  const city = String(profile.city || profile.location || '').toLowerCase();
  const loc = String(job.city || job.location || '').toLowerCase();
  if (city && loc && (city.includes(loc.split(',')[0]) || loc.includes(city.split(',')[0]))) score += 15;
  const skills = [
    ...(profile.clinicalSkills || []),
    ...(safeJsonParse(profile.skills, []) as string[]),
  ].map((s: string) => s.toLowerCase());
  const tags = safeJsonParse(job.tags, [] as string[]).map((t: string) => t.toLowerCase());
  if (tags.some((t: string) => skills.some((s: string) => s.includes(t) || t.includes(s)))) score += 5;
  return Math.min(98, Math.max(52, score));
}

export const formatJob = (job: any, profile?: any) => ({
  ...job,
  hospital: job.hospital?.name ?? job.hospital ?? 'Unknown Hospital',
  hospitalVerified: job.hospital?.verified ?? false,
  hospitalAbout: job.hospital?.about ?? '',
  tags: safeJsonParse(job.tags, []),
  responsibilities: safeJsonParse(job.responsibilities, []),
  requirements: safeJsonParse(job.requirements, []),
  perks: safeJsonParse(job.perks, []),
  customApplicationFields: parseJobCustomFields(job.customApplicationFields),
  applicants: job.applications?.length ?? 0,
  shortlisted: job.applications?.filter((a: any) => a.status === 'Shortlisted').length ?? 0,
  matchPercent: profile ? computeJobMatch(job, profile) : undefined,
});

export const formatApp = (app: any) => ({
  ...app,
  customFieldResponses: safeJsonParse(app.customFieldResponses, {} as Record<string, unknown>),
  candidate: formatCandidate(app.candidate),
  job: app.job
    ? {
        ...app.job,
        hospital: app.job.hospital?.name ?? app.job.hospital,
        customApplicationFields: parseJobCustomFields(app.job.customApplicationFields),
      }
    : app.job,
});

// ─── Plan limits ─────────────────────────────────────────────────────────────

export const PLAN_RECRUITER_LIMITS: Record<string, number> = {
  Basic:   3,
  Pro:     10,
  Premium: 20,
};

export const PLAN_JOB_LIMITS: Record<string, number> = {
  Basic: 5,
  Pro: 10,
  Premium: 15,
};

export const PLAN_SEARCH_LIMITS: Record<string, number> = {
  Basic: 30,
  Pro: 50,
  Premium: 100,
};

export function getRecruiterLimit(plan: string): number {
  return PLAN_RECRUITER_LIMITS[plan] ?? 3;
}

export function getJobLimit(plan: string): number {
  return PLAN_JOB_LIMITS[plan] ?? 5;
}

export function getSearchLimit(plan: string): number {
  return PLAN_SEARCH_LIMITS[plan] ?? 30;
}

export function computeVisibilityEndsAt(plan: string): Date {
  const now = new Date();
  if (plan === 'Pro') {
    now.setDate(now.getDate() + 21); // 3 weeks
  } else if (plan === 'Premium') {
    now.setDate(now.getDate() + 30); // 1 month
  } else {
    // Basic or fallback
    now.setTime(now.getTime() + 17.5 * 24 * 60 * 60 * 1000); // 17.5 days
  }
  return now;
}

export async function ensureUsageReset(prisma: any, user: any) {
  if (!user || user.role !== 'RECRUITER') return user;
  
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // If the user's recorded start date is before the first of this month, reset counters
  if (new Date(user.currentMonthStartDate) < currentMonthStart) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        currentMonthStartDate: currentMonthStart,
        jobsPostedThisMonth: 0,
        premiumSearchesThisMonth: 0,
      }
    });
  }
  return user;
}

// ─── JWT helper (for candidateId lookup in public routes) ────────────────────

export function extractCandidatePayload(
  authHeader: string | undefined,
  secret: string,
): { candidateId: string; role: string } | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authHeader.slice(7), secret) as any;
    if (payload.role !== 'CANDIDATE' || !payload.candidateId) return null;
    return { candidateId: payload.candidateId, role: payload.role };
  } catch {
    return null;
  }
}
