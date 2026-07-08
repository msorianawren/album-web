import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StudioShell } from "@/components/studio/StudioShell";
import { getPublicSession } from "@/lib/auth";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
    },
  },
};

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const session = await getPublicSession();

  if (!session.userId) redirect("/login?next=/studio");
  if (session.isBlocked) redirect("/boycott");

  if (!session.isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <section className="w-full max-w-xl rounded-[1.6rem] border border-border bg-surface/90 p-6 text-center shadow-2xl shadow-text-primary/10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary text-text-primary">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
            403
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-text-primary">
            Studio access denied
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            This Google account can view the website, but it does not have Studio management access.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/">
              <Button variant="secondary">View public site</Button>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <StudioShell session={session}>{children}</StudioShell>;
}
