"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n-client";

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
  label,
  compact,
  disabled,
}: DownloadButtonProps) {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const buttonLabel = label ?? t("media.download");

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
      setMessage(t("media.ready"));
    } catch {
      setMessage(t("media.failed"));
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
        aria-label={buttonLabel}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {!compact ? <span>{isLoading ? t("media.preparing") : buttonLabel}</span> : null}
      </Button>
      {!compact && message ? (
        <span className="text-xs text-text-secondary" aria-live="polite">
          {message}
        </span>
      ) : null}
    </span>
  );
}
