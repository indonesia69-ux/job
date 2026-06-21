import jwt from 'jsonwebtoken';
import prisma from './prisma';
import { BILLING_CYCLE_DAYS } from '../config/plans';
import type { UserJwtPayload } from '../middleware/auth';

// ─── JSON helpers ────────────────────────────────────────────────────────────

export function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== 'string') return val as T;
  try { return JSON.parse(val) as T; } catch { return fallback; }
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

export function getHospitalValidity(hospital: {
  approvedAt?: Date | null;
  submittedAt?: Date | null;
  planExpiresAt?: Date | null;
}) {
  if (!hospital) return { isLocked: true, daysRemaining: 0 };

  let expirationDate: Date | null = hospital.planExpiresAt ?? null;

  if (!expirationDate) {
    const start = hospital.approvedAt || hospital.submittedAt;
    if (!start) return { isLocked: true, daysRemaining: 0 };

    expirationDate = new Date(start);
    expirationDate.setDate(expirationDate.getDate() + BILLING_CYCLE_DAYS);
  }

  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    isLocked: daysRemaining === 0,
    daysRemaining,
  };
}

// ─── Candidate helpers ───────────────────────────────────────────────────────

function redactCandidateContact(candidate: any) {
  if (!candidate) return candidate;
  const c = { ...candidate };
  delete c.email;
  delete c.phone;
  delete c.mobile;
  delete c.cvUrl;
  delete c.cvCloudinaryId;
  delete c.uploadedCvData;
  if (c.profileJson) {
    const profile = safeJsonParse<Record<string, unknown>>(c.profileJson, {});
    delete profile.email;
    delete profile.phone;
    delete profile.mobile;
    c.profileJson = profile;
  }
  if (c.profile && typeof c.profile === 'object') {
    c.profile = { ...c.profile };
    delete c.profile.email;
    delete c.profile.phone;
    delete c.profile.mobile;
  }
  return c;
}

export const formatCandidate = (c: any, options?: { redactContact?: boolean }) => {
  const source = options?.redactContact ? redactCandidateContact(c) : c;
  return {
    ...source,
    skills: safeJsonParse(source.skills, []),
    languages: safeJsonParse(source.languages, []),
    procedures: safeJsonParse(source.procedures, []),
    education: safeJsonParse(source.education, []),
    certifications: safeJsonParse(source.certifications, []),
    experience: safeJsonParse(source.experience, []),
    preferredLocations: safeJsonParse(source.preferredLocations, []),
    profile: source.profileJson ? safeJsonParse(source.profileJson, null) : null,
    supportingDocuments: safeJsonParse(source.supportingDocuments, []),
  };
};

export const formatLockedCandidate = (c: any) => ({
  id: c.id,
  locked: true,
  specialty: c.specialty,       // safe — broad clinical category
  experienceYears: c.experienceYears, // safe — number only
});

export function buildSearchBlob(data: any): string {
  const lower = (value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value).toLowerCase();
    }
    return String(value ?? '').toLowerCase();
  };
  return [
    data.name,
    data.role,
    data.specialty,
    data.location,
    data.summary,
    data.currentEmployer,
    data.skills,
    data.education,
    data.certifications,
    data.experience,
    data.profileJson,
    data.preferredLocations,
    data.procedures,
  ].map(lower).join(' ');
}

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
    name: String(profile.name || '').slice(0, 100),
    initials,
    role: String(profile.role || '').slice(0, 100),
    specialty: (profile.specialty
      ? String(profile.specialty)
      : profile.clinicalSkills?.[0]
        ? String(profile.clinicalSkills[0])
        : String(profile.role || '')).slice(0, 100),
    experienceYears: Number(profile.yearsExperience || 0),
    location: String(profile.state || profile.city || '').slice(0, 150),
    currentEmployer: profile.experience?.[0]?.hospital ? String(profile.experience[0].hospital).slice(0, 150) : null,
    summary: String(profile.summary || '').slice(0, 5000),
    verified: Boolean(profile.verified),
    registration: profile.registrationNumber
      ? `${profile.registrationNumber}${profile.registrationCouncil ? ` (${profile.registrationCouncil})` : ''}`
      : null,
    email: String(profile.email || userEmail),
    phone: profile.phone ? String(profile.phone) : null,
    languages: JSON.stringify(profile.languages || []),
    procedures: JSON.stringify(profile.procedures || []),
    skills: [...(profile.clinicalSkills || []), ...(profile.technicalSkills || [])],
    education: profile.qualifications || [],
    certifications: profile.certifications || [],
    experience: experienceMapped,
    matchPercent: Number(profile.completeness || 70),
    profileJson: profile,
    cvSource: 'form',
    expectedSalaryMin: Number(profile.expectedSalaryMin || 0) || null,
    expectedSalaryMax: Number(profile.expectedSalaryMax || 0) || null,
    currentSalaryMin: Number(profile.currentSalaryMin || 0) || null,
    currentSalaryMax: Number(profile.currentSalaryMax || 0) || null,
    noticePeriod: profile.availability || null,
    preferredLocations: profile.preferredLocations || [],
    availabilityStatus: profile.availabilityStatus || null,
  };

  updateData.searchBlob = buildSearchBlob(updateData);

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
    updateData.supportingDocuments = supportingDocsUpload;
  }

  const updatedCandidate = await prisma.candidate.update({
    where: { id: candidateId },
    data: updateData,
  });

  // Keep the core User.mobile in sync with Candidate.phone so SMS password reset works properly
  if (updateData.phone) {
    await prisma.user.updateMany({
      where: { candidate: { id: candidateId } },
      data: { mobile: updateData.phone, name: updateData.name },
    });
  }

  return updatedCandidate;
}


// ─── Job helpers ─────────────────────────────────────────────────────────────

export function parseJobCustomFields(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
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
      // 'false' means the candidate answered "No" — that IS a valid response.
      // Only treat as unanswered when raw is completely absent (undefined/null).
      if (field.required && (raw === undefined || raw === null)) {
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

export const formatJob = (job: any, profile?: any, options?: { redactPosterEmail?: boolean }) => ({
  ...job,
  hospital: job.hospital?.name ?? job.hospital ?? 'Unknown Hospital',
  hospitalVerified: job.hospital?.verified ?? false,
  hospitalAbout: job.hospital?.about ?? '',
  postedBy: job.postedBy
    ? {
        id: job.postedBy.id,
        name: job.postedBy.name,
        ...(options?.redactPosterEmail ? {} : { email: job.postedBy.email }),
      }
    : null,
  closedReason: job.closedReason,
  tags: safeJsonParse(job.tags, []),
  responsibilities: safeJsonParse(job.responsibilities, []),
  requirements: safeJsonParse(job.requirements, []),
  perks: safeJsonParse(job.perks, []),
  customApplicationFields: parseJobCustomFields(job.customApplicationFields),
  applicants: job._count?.applications ?? job.applications?.length ?? 0,
  shortlisted: job.applications?.filter((a: any) => a.status === 'Shortlisted').length ?? 0,
  matchPercent: profile ? computeJobMatch(job, profile) : undefined,
});

export const formatApp = (app: any, options?: { redactCandidateContact?: boolean }) => ({
  ...app,
  ...(options?.redactCandidateContact
    ? {
        cvUrl: null,
        cvCloudinaryId: null,
        uploadedCvData: null,
        interviewerEmail: null,
      }
    : {}),
  customFieldResponses: options?.redactCandidateContact
    ? ({} as Record<string, unknown>)
    : safeJsonParse(app.customFieldResponses, {} as Record<string, unknown>),
  interviewHistory: safeJsonParse(app.interviewHistory, null),
  requestedDocumentList: safeJsonParse(app.requestedDocumentList, [] as string[]),
  supportingDocuments: options?.redactCandidateContact
    ? []
    : safeJsonParse(app.supportingDocuments, []),
  candidate: formatCandidate(app.candidate, { redactContact: options?.redactCandidateContact }),
  job: app.job
    ? {
        ...app.job,
        hospital: app.job.hospital?.name ?? app.job.hospital,
        customApplicationFields: parseJobCustomFields(app.job.customApplicationFields),
      }
    : app.job,
});

export {
  BILLING_CYCLE_DAYS,
  DEFAULT_PLAN_TIER,
  computeVisibilityEndsAt,
  getJobLimit,
  getRecruiterLimit,
  getSearchLimit,
} from '../config/plans';

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

export async function extractCandidatePayload(
  authHeader: string | undefined,
  secret: string,
): Promise<{ candidateId: string; role: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authHeader.slice(7), secret) as UserJwtPayload;
    if (payload.role !== 'CANDIDATE' || !payload.candidateId) return null;

    // Same revocation/suspension checks as requireAuth — fail closed → treat as unauthenticated
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        tokenVersion: true,
        isSuspended: true,
        deletedAt: true,
        hospital: { select: { isSuspended: true, deletedAt: true } },
      },
    });
    if (!user) return null;
    if (user.tokenVersion !== (payload.tokenVersion ?? 0)) return null;
    if (user.isSuspended || user.deletedAt) return null;
    if (user.hospital && (user.hospital.isSuspended || user.hospital.deletedAt)) return null;

    return { candidateId: payload.candidateId, role: payload.role };
  } catch {
    return null;
  }
}
