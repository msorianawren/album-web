import { useEffect, useRef, useState, useCallback } from "react";
import type { SiteSettings, StudioMediaItem } from "@/lib/types";

export type QueueStatus =
  | "queued"
  | "validating"
  | "requesting"
  | "uploading"
  | "processing"
  | "done"
  | "failed"
  | "cancelled";

export interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  progress: number;
  message: string;
  previewUrl: string;
  result?: StudioMediaItem;
}

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];

const PRESIGN_TIMEOUT_MS = 25_000;
const DIRECT_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
const COMPLETION_TIMEOUT_MS = 30_000;

function generateQueueId() {
  return crypto.randomUUID();
}

export function useUploadQueue(settings: SiteSettings) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // We use refs for mutable state so async callbacks don't have stale closures.
  const queueRef = useRef<QueueItem[]>([]);
  const activeXhrs = useRef<Record<string, XMLHttpRequest>>({});
  const activeRequests = useRef<Record<string, AbortController>>({});
  const isUploadingRef = useRef(false);

  const syncQueue = useCallback(() => {
    setQueue([...queueRef.current]);
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    queueRef.current = queueRef.current.map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    syncQueue();
  }, [syncQueue]);

  const validateFile = useCallback((file: File) => {
    const isImage = imageTypes.includes(file.type);
    const isVideo = videoTypes.includes(file.type);
    if (!isImage && !isVideo) return "Unsupported file type.";
    if (isImage && !settings.enable_image_uploads) return "Image uploads are disabled.";
    if (isVideo && !settings.enable_video_uploads) return "Video uploads are disabled.";
    if (isImage && file.size > settings.max_image_size_mb * 1024 * 1024) {
      return `Image is larger than ${settings.max_image_size_mb} MB.`;
    }
    if (isVideo && file.size > settings.max_video_size_mb * 1024 * 1024) {
      return `Video is larger than ${settings.max_video_size_mb} MB.`;
    }
    return null;
  }, [settings]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).slice(0, settings.max_upload_files_per_batch);
    const newItems: QueueItem[] = incoming.map((file) => {
      const error = validateFile(file);
      return {
        id: generateQueueId(),
        file,
        status: error ? "failed" : "queued",
        progress: error ? 100 : 0,
        message: error ?? "Ready",
        previewUrl: URL.createObjectURL(file),
      };
    });

    queueRef.current = [...newItems, ...queueRef.current];
    syncQueue();
  }, [settings, syncQueue, validateFile]);

  const removeFile = useCallback((id: string) => {
    const item = queueRef.current.find((q) => q.id === id);
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    if (activeXhrs.current[id]) {
      activeXhrs.current[id].abort();
      delete activeXhrs.current[id];
    }
    activeRequests.current[id]?.abort();
    delete activeRequests.current[id];
    queueRef.current = queueRef.current.filter((q) => q.id !== id);
    syncQueue();
  }, [syncQueue]);

  const clearCompleted = useCallback(() => {
    const completed = queueRef.current.filter((q) => q.status === "done" || q.status === "cancelled");
    completed.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    queueRef.current = queueRef.current.filter((q) => q.status !== "done" && q.status !== "cancelled");
    syncQueue();
  }, [syncQueue]);

  const clearQueue = useCallback(() => {
    queueRef.current.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (activeXhrs.current[item.id]) {
        activeXhrs.current[item.id].abort();
      }
      activeRequests.current[item.id]?.abort();
    });
    activeXhrs.current = {};
    activeRequests.current = {};
    queueRef.current = [];
    syncQueue();
  }, [syncQueue]);

  const cancelFile = useCallback((id: string) => {
    if (activeXhrs.current[id]) {
      activeXhrs.current[id].abort();
      delete activeXhrs.current[id];
    }
    activeRequests.current[id]?.abort();
    delete activeRequests.current[id];
    updateItem(id, { status: "cancelled", message: "Upload cancelled.", progress: 0 });
  }, [updateItem]);

  const retryFile = useCallback((id: string) => {
    updateItem(id, { status: "queued", message: "Ready", progress: 0 });
  }, [updateItem]);

  const _uploadSingle = useCallback(async (item: QueueItem, targetAlbumId: string, onCompleteCallback?: (media: StudioMediaItem) => void) => {
    if (item.status === "cancelled") return;

    try {
      updateItem(item.id, { status: "requesting", message: "Requesting upload URL...", progress: 5 });

      const mediaType = item.file.type.startsWith("video/") ? "video" : "image";
      const presignController = new AbortController();
      const presignTimeout = window.setTimeout(() => presignController.abort(), PRESIGN_TIMEOUT_MS);
      activeRequests.current[item.id] = presignController;
      let presignRes: Response;
      try {
        presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: presignController.signal,
          body: JSON.stringify({
            albumId: targetAlbumId,
            uploadId: item.id,
            filename: item.file.name,
            size: item.file.size,
            mimeType: item.file.type,
            mediaType,
          }),
        });
      } catch (error) {
        if (presignController.signal.aborted) {
          throw new Error("[PRESIGN_TIMEOUT] Upload preparation took too long. Retry this file.");
        }
        throw error;
      } finally {
        window.clearTimeout(presignTimeout);
        delete activeRequests.current[item.id];
      }

      const presignPayload = await presignRes.json().catch(() => null);
      if (!presignRes.ok || !presignPayload?.success) {
        throw new Error(`[PRESIGN_FAILED] ${presignPayload?.message ?? "Presign failed."}`);
      }

      // Check cancellation again
      if (queueRef.current.find(q => q.id === item.id)?.status === "cancelled") return;

      const { mediaId, uploadUrl, r2Key, publicUrl } = presignPayload.data;

      updateItem(item.id, { status: "uploading", message: "Uploading directly to storage...", progress: 10 });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhrs.current[item.id] = xhr;

        xhr.open("PUT", uploadUrl);
        xhr.timeout = DIRECT_UPLOAD_TIMEOUT_MS;
        xhr.setRequestHeader("Content-Type", item.file.type);

        let lastPaintTime = 0;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            // Throttle UI updates to roughly 15fps
            const now = performance.now();
            if (now - lastPaintTime > 60 || e.loaded === e.total) {
              lastPaintTime = now;
              // XHR upload covers 10% to 75% of the total logical progress
              const percentComplete = Math.round((e.loaded / e.total) * 65) + 10;
              updateItem(item.id, {
                progress: percentComplete,
                message: `Uploading (${Math.round((e.loaded / e.total) * 100)}%)...`
              });
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else if (xhr.status === 403) {
            reject(new Error("[CORS_BLOCKED] Storage server returned 403. Check R2 CORS setup."));
          } else {
            reject(new Error(`[R2_PUT_FAILED] Storage server returned status ${xhr.status}.`));
          }
        };

        xhr.onerror = () => reject(new Error("[CSP_BLOCKED] Upload blocked by network or CORS."));
        xhr.ontimeout = () => reject(new Error("[R2_TIMEOUT] Storage upload timed out. Retry this file."));
        xhr.onabort = () => reject(new Error("Upload cancelled by user."));

        xhr.send(item.file);
      });

      delete activeXhrs.current[item.id];
      if (queueRef.current.find(q => q.id === item.id)?.status === "cancelled") return;

      updateItem(item.id, { status: "processing", progress: 85, message: "Processing media and recording metadata..." });

      const completionController = new AbortController();
      const completionTimeout = window.setTimeout(() => completionController.abort(), COMPLETION_TIMEOUT_MS);
      activeRequests.current[item.id] = completionController;
      let completeRes: Response;
      try {
        completeRes = await fetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: completionController.signal,
          body: JSON.stringify({
            albumId: targetAlbumId,
            mediaId,
            r2Key,
            publicUrl,
            filename: item.file.name,
            size: item.file.size,
            mimeType: item.file.type,
            mediaType,
          }),
        });
      } catch (error) {
        if (completionController.signal.aborted) {
          throw new Error("[COMPLETE_TIMEOUT] Upload verification took too long. Retry this file.");
        }
        throw error;
      } finally {
        window.clearTimeout(completionTimeout);
        delete activeRequests.current[item.id];
      }

      const completePayload = await completeRes.json().catch(() => null);
      if (!completeRes.ok || !completePayload?.success) {
        throw new Error(`[COMPLETE_FAILED] ${completePayload?.message ?? "Completion failed."}`);
      }

      if (queueRef.current.find(q => q.id === item.id)?.status === "cancelled") return;

      if (completePayload.data.queued) {
        updateItem(item.id, {
          status: "done",
          progress: 100,
          message: "Upload complete. Image queued for safe processing.",
        });
      } else {
        const result = completePayload.data.media as StudioMediaItem;
        updateItem(item.id, { status: "done", progress: 100, message: "Upload and processing complete.", result });
        if (onCompleteCallback) onCompleteCallback(result);
      }

    } catch (err) {
      delete activeXhrs.current[item.id];
      if (queueRef.current.find(q => q.id === item.id)?.status === "cancelled") return;
      updateItem(item.id, {
        status: "failed",
        progress: 100,
        message: err instanceof Error ? err.message : "Upload failed.",
      });
    }
  }, [updateItem]);

  const uploadAll = useCallback(async (targetAlbumId: string, onCompleteCallback?: (media: StudioMediaItem) => void) => {
    if (!targetAlbumId) return;
    if (isUploadingRef.current) return;

    isUploadingRef.current = true;
    setIsUploading(true);

    const CONCURRENCY_LIMIT = settings.advanced_settings?.perf_upload_concurrency ?? 2;
    const activeTasks = new Set<Promise<void>>();

    // Loop until no more queued items
    while (true) {
      if (!isUploadingRef.current) break; // Early exit if stopped globally

      const pending = queueRef.current.filter((q) => q.status === "queued" || q.status === "failed");
      
      if (pending.length === 0 && activeTasks.size === 0) {
        break; // Completely done
      }

      // If we have capacity and pending items, spawn new tasks
      while (activeTasks.size < CONCURRENCY_LIMIT && pending.length > 0) {
        const item = pending.shift()!;
        // Mark as requesting immediately to prevent picking it up again in the next loop iteration
        updateItem(item.id, { status: "requesting" });
        
        const task = _uploadSingle(item, targetAlbumId, onCompleteCallback).finally(() => {
          activeTasks.delete(task);
        });
        activeTasks.add(task);
      }

      // Wait for at least one task to finish before looking for more work
      if (activeTasks.size > 0) {
        await Promise.race(activeTasks);
      } else {
        break; // Failsafe
      }
    }

    isUploadingRef.current = false;
    setIsUploading(false);
  }, [updateItem, _uploadSingle, settings.advanced_settings?.perf_upload_concurrency]);

  const cancelRemaining = useCallback(() => {
    isUploadingRef.current = false; // Stop picking up new tasks
    Object.values(activeXhrs.current).forEach((xhr) => xhr.abort());
    activeXhrs.current = {};
    Object.values(activeRequests.current).forEach((controller) => controller.abort());
    activeRequests.current = {};
    
    // Mark queued/uploading as cancelled
    queueRef.current = queueRef.current.map(item => {
      if (["queued", "requesting", "uploading", "processing"].includes(item.status)) {
        return { ...item, status: "cancelled", message: "Cancelled globally.", progress: 0 };
      }
      return item;
    });
    syncQueue();
    setIsUploading(false);
  }, [syncQueue]);

  useEffect(() => () => {
    Object.values(activeXhrs.current).forEach((xhr) => xhr.abort());
    Object.values(activeRequests.current).forEach((controller) => controller.abort());
    queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  return {
    queue,
    isUploading,
    addFiles,
    removeFile,
    clearCompleted,
    clearQueue,
    cancelFile,
    retryFile,
    uploadAll,
    cancelRemaining,
  };
}
