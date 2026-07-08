import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "@/components/auth/LoginForm";
import { getDictionary, getRequestLocale, translate } from "@/lib/i18n";
import { getLandingPage } from "@/lib/landing";

export default async function LoginPage() {
  const [landing, locale] = await Promise.all([getLandingPage(), getRequestLocale()]);
  const t = (key: string) => translate(getDictionary(locale), key);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="page-shell-1440 grid min-h-[calc(100vh-5rem)] min-w-0 gap-6 py-6 sm:gap-8 sm:py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative min-h-[360px] min-w-0 overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-2xl shadow-text-primary/10 animate-editorial-in sm:min-h-[520px] sm:rounded-[2rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={landing.hero_image_url}
            alt=""
            className="hero-image-pan absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.22)_58%,rgba(0,0,0,0.08))]" />
          <div className="relative z-10 flex h-full max-w-3xl min-w-0 flex-col justify-end p-6 text-white sm:p-10 lg:p-12">
            <p className="break-words text-xs font-semibold uppercase opacity-75">{landing.eyebrow}</p>
            <h1 className="mt-4 max-w-2xl break-words text-[2.5rem] font-semibold leading-none sm:text-7xl">
              {landing.headline}
            </h1>
            <p className="mt-5 max-w-xl break-words text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              {landing.subheadline}
            </p>
            <div className="mt-6 grid w-full max-w-lg min-w-0 grid-cols-1 overflow-hidden rounded-[1.2rem] border border-white/20 bg-white/10 backdrop-blur sm:mt-8 sm:grid-cols-3">
              <div className="min-w-0 border-b border-white/20 p-4 sm:border-b-0 sm:border-r">
                <p className="break-words font-semibold">{landing.stat_one_value}</p>
                <p className="mt-1 break-words text-[0.68rem] uppercase text-white/70">{landing.stat_one_label}</p>
              </div>
              <div className="min-w-0 border-b border-white/20 p-4 sm:border-b-0 sm:border-r">
                <p className="break-words font-semibold">{landing.stat_two_value}</p>
                <p className="mt-1 break-words text-[0.68rem] uppercase text-white/70">{landing.stat_two_label}</p>
              </div>
              <div className="min-w-0 p-4">
                <p className="break-words font-semibold">{landing.stat_three_value}</p>
                <p className="mt-1 break-words text-[0.68rem] uppercase text-white/70">{landing.stat_three_label}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center animate-editorial-in [animation-delay:120ms]">
          <div className="min-w-0 rounded-[1.5rem] border border-border bg-surface/90 p-5 shadow-2xl shadow-text-primary/10 backdrop-blur sm:rounded-[2rem] sm:p-8">
            <p className="break-words text-xs font-medium uppercase tracking-[0.18em] text-text-secondary sm:text-sm sm:tracking-[0.2em]">
              {t("login.memberAccess")}
            </p>
            <h2 className="mt-3 break-words text-2xl font-semibold text-text-primary sm:text-3xl">
              {t("login.signInGoogle")}
            </h2>
            <p className="mt-3 break-words text-sm leading-6 text-text-secondary">
              {t("login.body")}
            </p>
            <div className="mt-7">
              <LoginForm />
            </div>
          </div>

          <div className="mt-5 min-w-0 rounded-[1.25rem] border border-border bg-surface/70 p-5 shadow-xl shadow-text-primary/5 sm:rounded-[1.5rem]">
            <p className="break-words text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              {t("home.studioNote")}
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-text-primary">
              {landing.feature_body}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
