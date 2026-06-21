import { apiBase, apiFetch } from "@/lib/api";
import { authHeader } from "@/store/authStore";
import type { Job } from "@/data/jobs";

export async function fetchSavedJobIds(): Promise<string[]> {
  // Backend GET /api/saved-jobs returns [{savedAt, job}] — extract job IDs from it
  const res = await apiFetch(`${apiBase()}/api/saved-jobs`, { headers: authHeader() });
  if (!res.ok) return [];
  const data = (await res.json()) as { savedAt: string; job: Job }[];
  return (data ?? []).map((item) => item.job?.id).filter(Boolean) as string[];
}

export async function fetchSavedJobs(): Promise<Job[]> {
  const res = await apiFetch(`${apiBase()}/api/saved-jobs`, { headers: authHeader() });
  if (!res.ok) throw new Error("Failed to load saved jobs");
  // Backend returns [{savedAt, job}] — extract the job objects
  const data = (await res.json()) as { savedAt: string; job: Job }[];
  return (data ?? []).map((item) => item.job).filter(Boolean) as Job[];
}

export async function saveJob(jobId: string): Promise<void> {
  const res = await apiFetch(`${apiBase()}/api/saved-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ jobId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to save job");
  }
}

export async function unsaveJob(jobId: string): Promise<void> {
  const res = await apiFetch(`${apiBase()}/api/saved-jobs/${jobId}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to remove saved job");
  }
}
