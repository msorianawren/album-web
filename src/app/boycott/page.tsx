import { AppHeader } from "@/components/AppHeader";
import { getPublicSession } from "@/lib/auth";
import { getDictionary, getRequestLocale, translate } from "@/lib/i18n";

export default async function BoycottPage() {
  const [session, locale] = await Promise.all([getPublicSession(), getRequestLocale()]);
  const t = (key: string) => translate(getDictionary(locale), key);
  const reason =
    session.blockedReason ??
    t("boycott.defaultReason");

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto flex min-h-[78vh] w-full max-w-4xl items-center px-4 py-10 sm:px-8 sm:py-16">
        <article className="w-full min-w-0 border border-border bg-surface px-5 py-8 shadow-2xl shadow-text-primary/10 sm:px-12 sm:py-14">
          <p className="break-words text-xs uppercase tracking-[0.2em] text-text-secondary sm:text-sm sm:tracking-[0.28em]">
            {t("boycott.notice")}
          </p>
          <h1 className="mt-6 break-words font-serif text-3xl leading-tight text-text-primary sm:text-5xl">
            {t("boycott.title")}
          </h1>
          <div className="mt-7 space-y-5 break-words font-serif text-lg leading-8 text-text-primary sm:mt-8 sm:text-xl sm:leading-9">
            <p>{t("boycott.greeting")}</p>
            <p>{t("boycott.body")}</p>
            <p className="border-l-2 border-border pl-5 italic text-text-secondary">
              {reason}
            </p>
            <p>{t("boycott.appeal")}</p>
            <p className="pt-4">{t("boycott.signoff")}</p>
            <p className="text-xl italic sm:text-2xl">{t("boycott.admin")}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
