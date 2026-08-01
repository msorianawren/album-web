import type { AboutProfile } from "@/lib/types";

export function HomePersonalLetter({ profile }: { profile: AboutProfile }) {
  const quote = profile.quote || "Art is not what you see, but what you make others see.";

  return (
    <section className="lcb-letter" aria-label="A personal note from Oriana Wren">
      <svg viewBox="0 0 180 90" aria-hidden="true">
        <path d="M8 76 C44 68 47 23 87 31 C111 36 113 66 170 12" />
        <path d="M54 53 C42 36 36 24 50 18 C62 24 62 39 54 53Z" />
        <path d="M112 42 C125 27 139 22 145 35 C138 47 123 49 112 42Z" />
      </svg>
      <span aria-hidden="true">“</span>
      <blockquote>{quote}</blockquote>
      <p>{profile.display_name || "Oriana Wren"}</p>
    </section>
  );
}
