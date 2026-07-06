"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const supportedTypes = ["jpg", "jpeg", "png", "webp", "heic", "avif"];

interface QueuedFile {
  id: string;
  name: string;
  progress: number;
}

export function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);

  function addFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files).map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      name: file.name,
      progress: Math.min(92, Math.max(12, Math.round(file.size / 80000))),
    }));

    setQueue((current) => [...nextFiles, ...current].slice(0, 5));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-16 sm:px-8 lg:px-12">
      <div
        className={cn(
          "flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface p-8 text-center transition",
          isDragging && "border-accent bg-surface-secondary",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-background">
          <CloudUpload className="h-6 w-6 text-accent" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">
          Drop photos here
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Supports {supportedTypes.join(", ")} up to 50MB per file.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
          multiple
          className="sr-only"
          onChange={handleFileChange}
        />
        <Button className="mt-6" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
      </div>

      {queue.length ? (
        <div className="mt-5 grid gap-3">
          {queue.map((file) => (
            <div
              key={file.id}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="truncate font-medium text-text-primary">
                  {file.name}
                </span>
                <span className="text-text-secondary">{file.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
