import { AppHeader } from "@/components/AppHeader";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-[960px] px-4 py-16 sm:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
          About
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-text-primary">
          A focused home for photo and video stories.
        </h1>
        <p className="mt-6 text-lg leading-8 text-text-secondary">
          Album Web is built as a premium sharing platform for curated visual
          collections. Public albums welcome visitors, updating albums keep
          viewers informed while new media is added, and private albums protect
          unpublished work while still showing a polished locked preview.
        </p>
      </section>
    </main>
  );
}
