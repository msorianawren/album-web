import { AppHeader } from "@/components/AppHeader";
import { getPublicSession } from "@/lib/auth";

export default async function BoycottPage() {
  const session = await getPublicSession();
  const reason =
    session.blockedReason ??
    "Your behavior on this website has not been in good faith, so the admin has blocked this Google account.";

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto flex min-h-[78vh] w-full max-w-4xl items-center px-4 py-10 sm:px-8 sm:py-16">
        <article className="w-full min-w-0 border border-border bg-surface px-5 py-8 shadow-2xl shadow-text-primary/10 sm:px-12 sm:py-14">
          <p className="break-words text-xs uppercase tracking-[0.2em] text-text-secondary sm:text-sm sm:tracking-[0.28em]">
            Notice from the administrator
          </p>
          <h1 className="mt-6 break-words font-serif text-3xl leading-tight text-text-primary sm:text-5xl">
            A letter regarding your access
          </h1>
          <div className="mt-7 space-y-5 break-words font-serif text-lg leading-8 text-text-primary sm:mt-8 sm:text-xl sm:leading-9">
            <p>Dear visitor,</p>
            <p>
              Your behavior on this website has not shown good faith. For the
              safety of the collection, the community, and the owner&apos;s work,
              the administrator has blocked this Google account from further
              access.
            </p>
            <p className="border-l-2 border-border pl-5 italic text-text-secondary">
              {reason}
            </p>
            <p>
              If this was a mistake, please contact the administrator through a
              trusted channel and explain the situation clearly.
            </p>
            <p className="pt-4">Respectfully,</p>
            <p className="text-xl italic sm:text-2xl">The administration</p>
          </div>
        </article>
      </section>
    </main>
  );
}
