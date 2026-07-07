import { AppHeader } from "@/components/AppHeader";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-8 sm:py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
          About
        </p>
        <h1 className="mt-4 break-words text-3xl font-semibold text-text-primary sm:text-4xl">
          A focused home for photo and video stories.
        </h1>
        <p className="mt-5 text-base leading-7 text-text-secondary sm:mt-6 sm:text-lg sm:leading-8">
          Album Web is built as a premium sharing platform for curated visual
          collections. Public albums welcome visitors, updating albums keep
          viewers informed while new media is added, and private albums protect
          unpublished work while still showing a polished locked preview.
        </p>
      </section>
    </main>
  );
}
