import type { Profile } from "@/data/profile";

export function rolesMatch(cRole: string, jRole: string, jSpec: string): boolean {
  const cr = cRole.toLowerCase();
  const jr = jRole.toLowerCase();
  const js = jSpec.toLowerCase();
  
  if (cr === jr || jr.includes(cr) || js.includes(cr)) return true;
  
  // Doctor mapping
  if (cr.includes("clinical practitioners & super specialists") && (jr.includes("doctor") || jr.includes("physician") || js.includes("doctor") || js.includes("medicine"))) return true;
  // Dentist mapping
  if (cr.includes("dentist") && (jr.includes("dentist") || js.includes("dentist") || js.includes("dental"))) return true;
  // Nurse mapping
  if (cr.includes("nursing") && (jr.includes("nurse") || js.includes("nurse"))) return true;
  // Technician mapping
  if (cr.includes("laboratory technologist") && (jr.includes("technician") || jr.includes("tech") || js.includes("technician") || js.includes("lab"))) return true;
  // Pharmacist mapping
  if (cr.includes("pharmacy") && (jr.includes("pharmacist") || jr.includes("pharmacy") || js.includes("pharmacist") || js.includes("pharmacy"))) return true;
  // Admin mapping
  if (cr.includes("administration") && (jr.includes("admin") || jr.includes("management") || js.includes("admin") || js.includes("management"))) return true;
  
  // Generic word overlap check for other roles
  const cWords = cr.split(/[^a-z0-9]+/).filter(w => w.length >= 4);
  const jWords = (jr + " " + js).split(/[^a-z0-9]+/).filter(w => w.length >= 4);
  return cWords.some(cw => jWords.some(jw => jw.includes(cw) || cw.includes(jw)));
}

export function scoreJobMatch(
  job: Record<string, any>,
  profile: Profile | null | undefined,
): number {
  if (!profile) return 0;
  let score = 40;
  const role = String(profile.role || "").toLowerCase();
  const jobRole = String(job.role || "").toLowerCase();
  const jobSpec = String(job.specialty || "").toLowerCase();
  if (role && rolesMatch(role, jobRole, jobSpec)) score += 20;
  const years = profile.yearsExperience ?? 0;
  const min = Number(job.experienceMin ?? 0);
  const max = Number(job.experienceMax ?? 20);
  if (years >= min && years <= max + 2) score += 20;
  else if (years >= min - 1) score += 10;
  const city = String(profile.city || "").toLowerCase();
  const loc = String(job.city || job.location || "").toLowerCase();
  if (city && loc && (city.includes(loc.split(",")[0]) || loc.includes(city.split(",")[0])))
    score += 15;
  const skills = [...profile.clinicalSkills, ...profile.technicalSkills].map((s) =>
    s.toLowerCase(),
  );
  const tags = (Array.isArray(job.tags) ? job.tags : []) as string[];
  if (tags.some((t) => skills.some((s) => s.includes(String(t).toLowerCase())))) score += 5;
  return Math.min(98, Math.max(52, score));
}

export function computeJobMatches<T extends Record<string, any>>(
  jobs: T[],
  profile: Profile | null | undefined,
): (T & { matchPercent: number })[] {
  if (!profile || profile.completeness < 20) {
    return jobs
      .map((j) => ({ ...j, matchPercent: (j.matchPercent as number) ?? 0 }))
      .filter((j) => j.matchPercent > 0)
      .sort((a, b) => b.matchPercent - a.matchPercent);
  }
  return jobs
    .map((j) => ({
      ...j,
      matchPercent: Number(j.matchPercent) || scoreJobMatch(j, profile),
    }))
    .filter((j) => j.matchPercent >= 55)
    .sort((a, b) => b.matchPercent - a.matchPercent);
}
