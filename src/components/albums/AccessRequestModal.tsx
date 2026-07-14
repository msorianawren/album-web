"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Album } from "@/lib/types";

type RequestScope = "selected_albums" | "all_private";

type AccessRequestIntent = {
  scope: RequestScope;
  albums: Pick<Album, "id" | "title" | "slug">[];
};

const policyVersion = "2026-07-14";
const phonePattern = /^[+\d\s().-]{8,40}$/;

function isAccessRequestIntent(detail: Album | AccessRequestIntent): detail is AccessRequestIntent {
  return "albums" in detail && Array.isArray(detail.albums);
}

function intentFromDetail(detail: Album | AccessRequestIntent): AccessRequestIntent {
  if (isAccessRequestIntent(detail)) {
    return {
      scope: detail.scope,
      albums: detail.albums.map((album) => ({
        id: album.id,
        title: album.title,
        slug: album.slug,
      })),
    };
  }

  return {
    scope: "selected_albums",
    albums: [{ id: detail.id, title: detail.title, slug: detail.slug }],
  };
}

export function AccessRequestModal() {
  const [intent, setIntent] = useState<AccessRequestIntent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    const handleOpen: EventListener = (event) => {
      const customEvent = event as CustomEvent<Album | AccessRequestIntent>;
      setIntent(intentFromDetail(customEvent.detail));
      setSuccess(false);
      setError(null);
      setAcceptedPolicy(false);
      setShowPolicy(false);
    };

    document.addEventListener("open-access-request", handleOpen);
    return () => document.removeEventListener("open-access-request", handleOpen);
  }, []);

  const selectedAlbumNames = useMemo(
    () => intent?.albums.map((album) => album.title).filter(Boolean) ?? [],
    [intent],
  );

  if (!intent) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const currentIntent = intent;
    if (!currentIntent) return;
    if (!acceptedPolicy) {
      setError("Please read and accept the private access policy.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const phone = String(formData.get("phone") ?? "").trim();
    if (!phonePattern.test(phone)) {
      setError("Please enter a real phone number with a country code, for example +84 912 345 678.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/albums/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: currentIntent.scope,
          albumIds: currentIntent.scope === "selected_albums" ? currentIntent.albums.map((album) => album.id) : [],
          full_name: formData.get("full_name"),
          phone,
          reason: formData.get("reason"),
          policyAccepted: true,
          policyVersion,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/albums")}`;
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || data.error?.message || "Failed to submit request.");
      }

      setSuccess(true);
      setTimeout(() => window.location.reload(), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Request private access</h3>
            <p className="mt-1 text-xs text-text-secondary">
              {intent.scope === "all_private"
                ? "Requesting all private albums."
                : `${intent.albums.length} selected private album${intent.albums.length > 1 ? "s" : ""}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIntent(null)}
            className="rounded-full p-2 text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
            aria-label="Close request form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-500">
              <Check className="h-8 w-8" />
            </div>
            <h4 className="text-xl font-semibold text-text-primary">Request submitted</h4>
            <p className="mt-2 text-text-secondary">
              Your request is under review. You will be notified when access is granted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
            <div className="mb-5 rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm text-text-primary">
                The selected private albums are reviewed manually. If no admin reviews your request within 7 days,
                eligible requests may be approved automatically.
              </p>
              {intent.scope === "selected_albums" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAlbumNames.slice(0, 8).map((title) => (
                    <span key={title} className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary">
                      {title}
                    </span>
                  ))}
                  {selectedAlbumNames.length > 8 && (
                    <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary">
                      +{selectedAlbumNames.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-text-primary">
                  Full name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  required
                  minLength={2}
                  maxLength={120}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
                  placeholder="Your real name"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text-primary">
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  required
                  inputMode="tel"
                  pattern="^[+\d\s().-]{8,40}$"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
                  placeholder="+84 912 345 678"
                />
                <p className="mt-1.5 text-xs text-text-secondary">
                  Use the same real phone number for all access requests.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-text-primary">
                Reason for access
              </label>
              <textarea
                id="reason"
                name="reason"
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Tell the owner why you need access to these private albums."
              />
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-text-primary">
              <p>Virtual, inconsistent, or unverifiable phone numbers may not be approved.</p>
              <p className="mt-2 text-text-secondary">
                Your phone number is used only for access review and safety checks. It is never shown publicly and is
                never included in notifications.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-background/50 p-4">
              <button
                type="button"
                onClick={() => setShowPolicy((value) => !value)}
                className="flex w-full items-center justify-between text-left text-sm font-semibold text-text-primary"
              >
                <span className="inline-flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Private Access Policy
                </span>
                <span className="text-xs uppercase tracking-widest text-text-secondary">{showPolicy ? "Hide" : "Read"}</span>
              </button>
              {showPolicy && (
                <div className="mt-4 grid gap-3 text-sm text-text-secondary">
                  <p><strong className="text-text-primary">Manual review.</strong> Private albums are checked by the owner before access is granted.</p>
                  <p><strong className="text-text-primary">Auto approval after 7 days.</strong> Eligible low-risk requests may be approved automatically if no admin reviews them.</p>
                  <p><strong className="text-text-primary">Real phone number.</strong> Use a consistent number. We check consistency and review signals; we do not claim SMS ownership verification.</p>
                  <p><strong className="text-text-primary">Privacy promise.</strong> Your phone number is never displayed publicly and never included in notifications.</p>
                  <p><strong className="text-text-primary">Possible denial.</strong> Duplicate, inconsistent, suspicious, blocked, or previously revoked requests may be denied or held for manual review.</p>
                </div>
              )}
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-background/50 p-4 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={(event) => setAcceptedPolicy(event.target.checked)}
                className="mt-1 h-4 w-4 accent-current"
              />
              <span>I understand and agree to the private access policy.</span>
            </label>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setIntent(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !acceptedPolicy}>
                {isSubmitting ? "Submitting..." : "Send request"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
