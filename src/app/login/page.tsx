import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "@/components/auth/LoginForm";
import { getLandingPage } from "@/lib/landing";

export default async function LoginPage() {
  const landing = await getLandingPage();

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1440px] gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
        <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-border bg-surface shadow-2xl shadow-text-primary/10 animate-editorial-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={landing.hero_image_url}
            alt=""
            className="hero-image-pan absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.22)_58%,rgba(0,0,0,0.08))]" />
          <div className="relative z-10 flex h-full max-w-3xl flex-col justify-end p-6 text-white sm:p-10 lg:p-12">
            <p className="text-xs font-semibold uppercase opacity-75">{landing.eyebrow}</p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-none sm:text-7xl">
              {landing.headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
              {landing.subheadline}
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-3 overflow-hidden rounded-[1.2rem] border border-white/20 bg-white/10 backdrop-blur">
              <div className="border-r border-white/20 p-4">
                <p className="font-semibold">{landing.stat_one_value}</p>
                <p className="mt-1 text-[0.68rem] uppercase text-white/70">{landing.stat_one_label}</p>
              </div>
              <div className="border-r border-white/20 p-4">
                <p className="font-semibold">{landing.stat_two_value}</p>
                <p className="mt-1 text-[0.68rem] uppercase text-white/70">{landing.stat_two_label}</p>
              </div>
              <div className="p-4">
                <p className="font-semibold">{landing.stat_three_value}</p>
                <p className="mt-1 text-[0.68rem] uppercase text-white/70">{landing.stat_three_label}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center animate-editorial-in [animation-delay:120ms]">
          <div className="rounded-[2rem] border border-border bg-surface/90 p-6 shadow-2xl shadow-text-primary/10 backdrop-blur sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
              Member access
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-text-primary">
              Sign in with Google
            </h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Register or sign in with a verified Google account to view albums.
              Admin tools remain available only to the approved owner account.
            </p>
            <div className="mt-7">
              <LoginForm />
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-border bg-surface/70 p-5 shadow-xl shadow-text-primary/5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Studio note
            </p>
            <p className="mt-2 text-sm leading-6 text-text-primary">
              {landing.feature_body}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
