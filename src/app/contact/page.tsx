import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { getDictionary, getRequestLocale, translate } from "@/lib/i18n";

export default async function ContactPage() {
  const locale = await getRequestLocale();
  const t = (key: string) => translate(getDictionary(locale), key);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto grid w-full max-w-[960px] gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
            {t("contact.eyebrow")}
          </p>
          <h1 className="mt-4 break-words text-3xl font-semibold text-text-primary sm:text-4xl">
            {t("contact.title")}
          </h1>
          <p className="mt-5 text-base leading-7 text-text-secondary">
            {t("contact.body")}
          </p>
        </div>
        <form className="grid min-w-0 gap-4 rounded-[1.25rem] border border-border bg-surface p-4 sm:rounded-[2rem] sm:p-6">
          <Input name="name" placeholder={t("contact.name")} required />
          <Input name="email" type="email" placeholder={t("contact.email")} required />
          <Textarea name="message" placeholder={t("contact.message")} required />
          <Button type="submit">{t("contact.send")}</Button>
        </form>
      </section>
    </main>
  );
}
