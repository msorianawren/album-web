"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Album } from "@/lib/types";

export function AccessRequestModal() {
  const [album, setAlbum] = useState<Album | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleOpen = (e: CustomEvent<Album>) => {
      setAlbum(e.detail);
      setSuccess(false);
      setError(null);
    };

    document.addEventListener("open-access-request" as any, handleOpen);
    return () => {
      document.removeEventListener("open-access-request" as any, handleOpen);
    };
  }, []);

  if (!album) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch(`/api/albums/${album!.id}/access-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_name: formData.get("requester_name"),
          requester_phone: formData.get("requester_phone"),
          reason: formData.get("reason"),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit request.");
      }

      setSuccess(true);
      
      // Update the local storage / state implicitly by refreshing the page
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Request private access
          </h3>
          <button
            onClick={() => setAlbum(null)}
            className="rounded-full p-2 text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold text-text-primary">Request submitted</h4>
            <p className="mt-2 text-text-secondary">
              Your request is under review. You will be notified when access is granted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <p className="mb-2 text-sm text-text-secondary">
              The album <strong className="text-text-primary">{album.title}</strong> is private.
            </p>
            <p className="mb-6 text-xs text-text-secondary/80">
              Private albums are reviewed manually. Please include a short reason so your request can be processed properly.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="requester_name" className="mb-1.5 block text-sm font-medium text-text-primary">
                  Full Name
                </label>
                <input
                  id="requester_name"
                  name="requester_name"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label htmlFor="requester_phone" className="mb-1.5 block text-sm font-medium text-text-primary">
                  Phone Number
                </label>
                <input
                  id="requester_phone"
                  name="requester_phone"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
                  placeholder="+1 234 567 890"
                />
              </div>

              <div>
                <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-text-primary">
                  Reason for access
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  required
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
                  placeholder="I am the client for this shoot..."
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setAlbum(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Send Request"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
