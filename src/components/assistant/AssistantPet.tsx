import { cn } from "@/lib/utils";
import {
  assistantMascots,
  DEFAULT_ASSISTANT_CHARACTER,
  DEFAULT_ASSISTANT_MOOD,
  type AssistantCharacter,
  type AssistantMood,
} from "@/lib/assistant/mascots";

type AssistantPetSize = "xs" | "sm" | "md" | "lg";

interface AssistantPetProps {
  character?: AssistantCharacter;
  mood?: AssistantMood;
  size?: AssistantPetSize;
  label?: string;
  decorative?: boolean;
  className?: string;
}

const sizePixels: Record<AssistantPetSize, number> = {
  xs: 32,
  sm: 56,
  md: 88,
  lg: 132,
};

export function AssistantPet({
  character = DEFAULT_ASSISTANT_CHARACTER,
  mood = DEFAULT_ASSISTANT_MOOD,
  size = "md",
  label,
  decorative = false,
  className,
}: AssistantPetProps) {
  const mascot = assistantMascots[character] ?? assistantMascots[DEFAULT_ASSISTANT_CHARACTER];
  const fallbackMascot = assistantMascots[DEFAULT_ASSISTANT_CHARACTER];
  const safeMood = mascot.supportedMoods.includes(mood) ? mood : mascot.defaultMood;
  const accessibleLabel = label ?? `${mascot.name}, Oriana Companion`;
  const pixelSize = sizePixels[size];

  return (
    <span
      className={cn(
        "assistant-pet",
        `assistant-pet--${mascot.id}`,
        `assistant-pet--${safeMood}`,
        `assistant-pet--${size}`,
        className,
      )}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : accessibleLabel}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* SVG mascots stay as public img assets so they do not enter the JS bundle. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mascot.src}
        alt={decorative ? "" : accessibleLabel}
        width={pixelSize}
        height={pixelSize}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          if (event.currentTarget.dataset.fallbackApplied === "true") return;
          event.currentTarget.dataset.fallbackApplied = "true";
          event.currentTarget.src = fallbackMascot.src;
          event.currentTarget.alt = decorative ? "" : `${fallbackMascot.name}, Oriana Companion`;
        }}
      />
    </span>
  );
}
