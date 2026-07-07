"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const [message, setMessage] = useState("");

  async function share() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setMessage("Shared");
        return;
      }

      await navigator.clipboard.writeText(url);
      setMessage("Copied");
    } catch {
      setMessage("Unable to share");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="secondary" onClick={share}>
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Share
      </Button>
      {message ? (
        <span className="text-xs text-text-secondary" aria-live="polite">
          {message}
        </span>
      ) : null}
    </span>
  );
}
