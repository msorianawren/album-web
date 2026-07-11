"use client";

import { UploadCloud, X, RotateCcw, Ban, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/utils";
import type { QueueItem } from "@/hooks/useUploadQueue";
import type { SiteSettings } from "@/lib/types";

export function UnifiedUploadPanel({
  queue,
  isUploading,
  addFiles,
  removeFile,
  clearCompleted,
  clearQueue,
  cancelFile,
  retryFile,
  cancelRemaining,
  settings,
  title = "Add multiple images or videos",
  description = "Preview files before uploading, remove mistakes, then publish them.",
}: {
  queue: QueueItem[];
  isUploading: boolean;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
  clearQueue: () => void;
  cancelFile: (id: string) => void;
  retryFile: (id: string) => void;
  cancelRemaining: () => void;
  settings: SiteSettings;
  title?: string;
  description?: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  const completedCount = queue.filter((q) => q.status === "done").length;
  const failedCount = queue.filter((q) => q.status === "failed").length;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Upload queue</p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
          
          {queue.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-background/50 p-4 text-sm">
              <p className="font-semibold text-text-primary mb-2">Summary</p>
              <div className="grid grid-cols-2 gap-2 text-text-secondary">
                <span>Total queued:</span> <span>{queue.length}</span>
                <span>Completed:</span> <span className={completedCount ? "text-emerald-500" : ""}>{completedCount}</span>
                <span>Failed:</span> <span className={failedCount ? "text-red-400 font-medium" : ""}>{failedCount}</span>
              </div>
            </div>
          )}
        </div>

        <div
          className={`rounded-[1.4rem] border border-dashed p-6 text-center transition flex flex-col items-center justify-center min-h-[240px] ${
            dragOver ? "border-accent bg-background" : "border-border bg-background/55"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-text-secondary" aria-hidden="true" />
          <p className="mt-3 font-semibold text-text-primary">Drop files here</p>
          <p className="mt-1 text-sm text-text-secondary">JPEG, PNG, WebP, AVIF, MP4, WebM, MOV.</p>
          <p className="mt-1 text-xs text-text-secondary">Up to {settings.max_upload_files_per_batch} files per batch.</p>
          <label className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-5 text-xs font-semibold uppercase tracking-[0.14em] text-text-primary hover:bg-surface-secondary transition-colors">
            Select files
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
              onChange={(event) => event.target.files && addFiles(event.target.files)}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-text-primary">
              {queue.length} file{queue.length === 1 ? "" : "s"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {completedCount > 0 && !isUploading && (
                <Button variant="secondary" onClick={clearCompleted}>
                  Clear completed
                </Button>
              )}
              {isUploading && (
                <Button variant="secondary" onClick={cancelRemaining}>
                  <Ban className="h-4 w-4" />
                  Cancel remaining
                </Button>
              )}
              {!isUploading && queue.length > 0 && (
                <Button variant="secondary" onClick={clearQueue}>
                  Clear all
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid gap-3">
            {queue.map((item) => (
              <article key={item.id} className={`grid gap-3 rounded-[1.1rem] border ${item.status === "failed" ? "border-red-500/30 bg-red-500/5" : "border-border bg-background/60"} p-3 md:grid-cols-[60px_1fr_120px_auto] md:items-center`}>
                <div className="aspect-square bg-surface-secondary rounded-lg overflow-hidden shrink-0">
                  {item.file.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={item.previewUrl} className="h-full w-full object-cover" preload="metadata" />
                  )}
                </div>
                
                <div className="min-w-0 flex flex-col justify-center">
                  <p className="truncate text-sm font-semibold text-text-primary" title={item.file.name}>{item.file.name}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{item.file.type || "unknown"} - {formatBytes(item.file.size)}</p>
                  
                  {/* Progress bar area */}
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                      <span 
                        className={`block h-full rounded-full transition-all duration-300 ${item.status === 'failed' ? 'bg-red-500' : item.status === 'done' ? 'bg-emerald-500' : 'bg-accent'}`} 
                        style={{ width: `${item.progress}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-medium w-8 text-right text-text-secondary">{item.progress}%</span>
                  </div>
                  <p className={`mt-1.5 text-xs truncate ${item.status === 'failed' ? 'text-red-400 font-medium' : 'text-text-secondary'}`} title={item.message}>
                    {item.message}
                  </p>
                </div>

                <div className="flex justify-start md:justify-center">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    item.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                    item.status === 'failed' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                    item.status === 'uploading' || item.status === 'processing' || item.status === 'requesting' ? 'border-accent/30 bg-accent/10 text-accent-foreground' :
                    'border-border bg-surface text-text-secondary'
                  }`}>
                    {item.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                    {item.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                    {(item.status === 'uploading' || item.status === 'processing' || item.status === 'requesting') && <Loader2 className="h-3 w-3 animate-spin" />}
                    {item.status}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  {item.status === "failed" && (
                    <Button variant="icon" onClick={() => retryFile(item.id)} aria-label="Retry upload" title="Retry">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  {(item.status === "uploading" || item.status === "requesting" || item.status === "processing") && (
                    <Button variant="icon" onClick={() => cancelFile(item.id)} aria-label="Cancel upload" title="Cancel">
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                  {item.status !== "uploading" && item.status !== "processing" && item.status !== "requesting" && (
                    <Button variant="icon" onClick={() => removeFile(item.id)} aria-label="Remove from queue" title="Remove">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
