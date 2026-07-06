import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto grid w-full max-w-[960px] gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-secondary">
            Contact Us
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-text-primary">
            Questions about an album?
          </h1>
          <p className="mt-5 text-base leading-7 text-text-secondary">
            Send a message to the owner for private access, collaboration, or
            download permissions.
          </p>
        </div>
        <form className="grid gap-4 rounded-[2rem] border border-border bg-surface p-6">
          <Input name="name" placeholder="Name" required />
          <Input name="email" type="email" placeholder="Email" required />
          <Textarea name="message" placeholder="Message" required />
          <Button type="submit">Send message</Button>
        </form>
      </section>
    </main>
  );
}
