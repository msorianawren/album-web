import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto flex min-h-[70vh] w-full max-w-[520px] flex-col justify-center px-4 py-16 sm:px-8">
        <div className="rounded-[2rem] border border-border bg-surface p-7">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
            Admin access
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-text-primary">
            Sign in to Studio
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Only the Supabase user matching DEFAULT_OWNER_ID can manage albums.
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
