export const CV_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const CV_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const CV_MAX_BYTES = 5 * 1024 * 1024;

import { apiBase, apiFetch } from "./api";

export type UploadedFile = {
  file?: File;
  name: string;
  mime: string;
  url?: string;
  publicId?: string;
  data?: string; // Kept optional for backwards compatibility
};

export function isAllowedCvFile(file: File): boolean {
  return (
    CV_MIME_TYPES.includes(file.type as (typeof CV_MIME_TYPES)[number]) ||
    /\.(pdf|doc|docx)$/i.test(file.name)
  );
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function fileToUploaded(file: File): Promise<UploadedFile> {
  if (!isAllowedCvFile(file)) {
    throw new Error("Please upload a PDF or Word document (.pdf, .doc, .docx)");
  }
  if (file.size > CV_MAX_BYTES) {
    throw new Error("File must be under 5MB");
  }
  return {
    file,
    name: file.name,
    mime: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/msword"),
  };
}

// Upload file to our backend Cloudinary proxy route
export async function uploadCvToBackend(
  file: File,
  token: string,
): Promise<{ url: string; publicId: string; name?: string; mime?: string }> {
  const formData = new FormData();
  formData.append("cv", file);

  const backendUrl = apiBase();

  const res = await apiFetch(`${backendUrl}/api/upload/cv`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to upload CV file");
  }

  return res.json();
}

// Upload multiple supporting documents
export async function uploadDocumentsToBackend(
  files: File[],
  token: string,
): Promise<{ url: string; publicId: string; name?: string; mime?: string }[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("documents", file);
  }

  const backendUrl = apiBase();

  const res = await apiFetch(`${backendUrl}/api/upload/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to upload documents");
  }

  return res.json();
}
