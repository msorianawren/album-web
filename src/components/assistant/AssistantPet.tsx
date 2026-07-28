import {
  getCompanionAsset,
  hasGeneratedStateAsset,
} from "@/lib/assistant/companion-assets";
import {
  BrainCircuit,
  Check,
  CircleAlert,
  CircleX,
  Ear,
  MessageCircleMore,
  MoonStar,
  PartyPopper,
  Sparkles,
  Timer,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { type CompanionMotion } from "@/lib/assistant/preferences";
import {
  companionStateDefinitions,
  companionStates,
  companionStateVisualCues,
  type CompanionState,
} from "@/lib/assistant/companion-state-machine";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ASSISTANT_CHARACTER,
  type AssistantCharacter,
  type AssistantMood,
} from "@/lib/assistant/mascots";

type AssistantPetSize = "xs" | "sm" | "md" | "lg";
type PetState = CompanionState | AssistantMood;

interface AssistantPetProps {
  character?: AssistantCharacter;
  mood?: PetState;
  state?: CompanionState;
  motion?: CompanionMotion;
  size?: AssistantPetSize;
  label?: string;
  decorative?: boolean;
  priority?: boolean;
  className?: string;
}

const sizePixels: Record<AssistantPetSize, number> = {
  xs: 32,
  sm: 56,
  md: 88,
  lg: 132,
};

const legacyMoodToState: Record<AssistantMood, CompanionState> = {
  idle: "idle",
  qa: "listening",
  shy: "warning",
  sad: "unavailable",
  celebrate: "celebration",
  loading_dance: "waiting",
  warning: "warning",
  success: "success",
};

const stateIcons: Record<CompanionState, LucideIcon> = {
  idle: Sparkles,
  listening: Ear,
  thinking: BrainCircuit,
  answering: MessageCircleMore,
  waiting: Timer,
  success: Check,
  celebration: PartyPopper,
  warning: CircleAlert,
  error: CircleX,
  unavailable: WifiOff,
  sleeping: MoonStar,
};

function normalizeState(state: PetState | undefined): CompanionState {
  if (!state) return "idle";
  return companionStates.includes(state as CompanionState)
    ? (state as CompanionState)
    : legacyMoodToState[state as AssistantMood] ?? "idle";
}

export function AssistantPet({
  character = DEFAULT_ASSISTANT_CHARACTER,
  mood,
  state,
  motion = "still",
  size = "md",
  label,
  decorative = false,
  priority = false,
  className,
}: AssistantPetProps) {
  const companionState = normalizeState(state ?? mood);
  const asset = getCompanionAsset(character, companionState);
  const fallback = getCompanionAsset(DEFAULT_ASSISTANT_CHARACTER, "idle");
  const accessibleLabel = label ?? asset.label;
  const pixelSize = sizePixels[size];
  const StateIcon = stateIcons[companionState];
  const hasDedicatedStateArt = hasGeneratedStateAsset(character, companionState);
  const stateLabel = companionStateDefinitions[companionState].label;

  return (
    <span
      className={cn("assistant-pet", `assistant-pet--${size}`, className)}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : accessibleLabel}
      data-companion-state={companionState}
      data-companion-motion={motion}
      data-companion-art={hasDedicatedStateArt ? "dedicated" : "composed"}
      data-companion-cue={companionStateVisualCues[companionState]}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Public WebP derivatives keep Companion art out of the JavaScript bundle. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt={decorative ? "" : `${accessibleLabel} — ${stateLabel}`}
        width={asset.width}
        height={asset.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onError={(event) => {
          if (event.currentTarget.dataset.fallbackApplied === "true") return;
          event.currentTarget.dataset.fallbackApplied = "true";
          event.currentTarget.src = asset.fallbackSrc || fallback.src;
          event.currentTarget.alt = decorative ? "" : fallback.label;
        }}
      />
      <span className="assistant-pet__state-signal" aria-hidden="true">
        <StateIcon strokeWidth={2.2} />
      </span>
    </span>
  );
}
