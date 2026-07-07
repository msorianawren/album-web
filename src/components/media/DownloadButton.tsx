"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DownloadButtonProps {
  href: string;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
}

function filenameFromDisposition(disposition: string | null) {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "download";
}

export function DownloadButton({
  href,
  label = "Download",
  compact,
  disabled,
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function download() {
    if (disabled || isLoading) return;
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromDisposition(response.headers.get("content-disposition"));
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Ready");
    } catch {
      setMessage("Failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant={compact ? "icon" : "secondary"}
        className={
          compact
            ? "h-9 w-9 border-lightbox-border bg-lightbox-control text-accent-foreground"
            : undefined
        }
        onClick={download}
        disabled={disabled || isLoading}
        aria-label={label}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {!compact ? <span>{isLoading ? "Preparing..." : label}</span> : null}
      </Button>
      {!compact && message ? (
        <span className="text-xs text-text-secondary" aria-live="polite">
          {message}
        </span>
      ) : null}
    </span>
  );
}
