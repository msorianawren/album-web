import type { AdminStory } from "@/lib/types";

export interface StoryUploadLimits {
  maxVideoSizeBytes: number;
  maxDurationSeconds: number;
}

export interface StoryListResponse {
  stories: AdminStory[];
  limits: StoryUploadLimits;
}

export async function readApiData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as { success?: boolean; data?: T; message?: string } | null;
  if (!response.ok || !payload?.success || payload.data === undefined) {
    throw new Error(payload?.message || "The request could not be completed.");
  }
  return payload.data;
}

export function uploadBlobDirectly({
  uploadUrl,
  body,
  contentType,
  onProgress,
  signal,
}: {
  uploadUrl: string;
  body: Blob;
  contentType: string;
  onProgress: (progress: number) => void;
  signal: AbortSignal;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      signal.removeEventListener("abort", abort);
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed with status ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error("Storage upload failed because of a network error."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    xhr.send(body);
  });
}
