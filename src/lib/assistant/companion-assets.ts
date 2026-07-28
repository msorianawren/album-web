import {
  assistantCharacterIds,
  assistantMascots,
  DEFAULT_ASSISTANT_CHARACTER,
  type AssistantCharacter,
} from "./mascots.ts";
import { companionStates, type CompanionState } from "./companion-state-machine.ts";

export type CompanionAssetBudget = "dock" | "panel";
export type CompanionAssetProvenance = "imagegen-2026-07" | "legacy-svg";

export interface CompanionAsset {
  src: string;
  fallbackSrc: string;
  width: number;
  height: number;
  byteBudget: number;
  budget: CompanionAssetBudget;
  themes: readonly ["day", "sunset", "night"];
  label: string;
  provenance: CompanionAssetProvenance;
  animatedSrc?: string;
}

export interface CompanionCharacterAssets {
  portrait: CompanionAsset;
  states: Partial<Record<CompanionState, CompanionAsset>>;
}

const themes = ["day", "sunset", "night"] as const;
const generatedStateBudget = 30_000;

function generatedAsset(src: string, label: string, width = 512, height = 768): CompanionAsset {
  return {
    src,
    fallbackSrc: "/assistant/companion-v2/mira/idle.webp",
    width,
    height,
    byteBudget: generatedStateBudget,
    budget: width <= 512 ? "dock" : "panel",
    themes,
    label,
    provenance: "imagegen-2026-07",
  };
}

function legacyAsset(character: AssistantCharacter): CompanionAsset {
  const mascot = assistantMascots[character];
  return {
    src: mascot.src,
    fallbackSrc: "/assistant/companion-v2/mira/idle.webp",
    width: 128,
    height: 128,
    byteBudget: 4_000,
    budget: "dock",
    themes,
    label: `${mascot.name}, Oriana Companion`,
    provenance: "legacy-svg",
  };
}

const miraStates = Object.fromEntries(
  companionStates.map((state) => [
    state,
    generatedAsset(
      `/assistant/companion-v2/mira/${state}.webp`,
      `Mira, ${state.replace("_", " ")} state`,
    ),
  ]),
) as Record<CompanionState, CompanionAsset>;

const flagshipPortraits: Partial<Record<AssistantCharacter, CompanionAsset>> = {
  fox: generatedAsset("/assistant/companion-v2/portraits/fox.webp", "Rue, Oriana Companion", 512, 512),
  owl: generatedAsset("/assistant/companion-v2/portraits/owl.webp", "Noa, Oriana Companion", 512, 512),
  panda: generatedAsset("/assistant/companion-v2/portraits/panda.webp", "Luma, Oriana Companion", 512, 512),
  rabbit: generatedAsset("/assistant/companion-v2/portraits/rabbit.webp", "Nini, Oriana Companion", 512, 512),
  red_panda: generatedAsset("/assistant/companion-v2/portraits/red_panda.webp", "Rumi, Oriana Companion", 512, 512),
  deer: generatedAsset("/assistant/companion-v2/portraits/deer.webp", "Aster, Oriana Companion", 512, 512),
};

export const flagshipCompanionCharacterIds = [
  DEFAULT_ASSISTANT_CHARACTER,
  "fox",
  "owl",
  "panda",
  "rabbit",
  "red_panda",
  "deer",
] as const satisfies readonly AssistantCharacter[];

export const companionAssets: Record<AssistantCharacter, CompanionCharacterAssets> = Object.fromEntries(
  assistantCharacterIds.map((character) => {
    const portrait = character === DEFAULT_ASSISTANT_CHARACTER
      ? miraStates.idle
      : flagshipPortraits[character] ?? legacyAsset(character);
    return [
      character,
      {
        portrait,
        states: character === DEFAULT_ASSISTANT_CHARACTER ? miraStates : { idle: portrait },
      },
    ];
  }),
) as Record<AssistantCharacter, CompanionCharacterAssets>;

export function getCompanionAsset(character: AssistantCharacter, state: CompanionState = "idle") {
  const safeCharacter = companionAssets[character] ? character : DEFAULT_ASSISTANT_CHARACTER;
  const characterAssets = companionAssets[safeCharacter];
  return characterAssets.states[state] ?? characterAssets.portrait;
}

export function hasGeneratedStateAsset(character: AssistantCharacter, state: CompanionState) {
  return companionAssets[character]?.states[state]?.provenance === "imagegen-2026-07";
}

export function validateCompanionAssetManifest() {
  return assistantCharacterIds.every((character) => {
    const asset = companionAssets[character]?.portrait;
    return Boolean(asset?.src && asset.fallbackSrc && asset.width > 0 && asset.height > 0 && asset.byteBudget > 0);
  }) && companionStates.every((state) => Boolean(companionAssets[DEFAULT_ASSISTANT_CHARACTER].states[state]));
}

export const companionAssetProvenance = {
  version: 1,
  generator: "OpenAI Image Generation",
  generatedOn: "2026-07-29",
  derivativeFormat: "WebP",
  sourcePolicy: "Original prompts only; no third-party character, artist, or game asset reference was used.",
  statePromptFamily: "Mira uses locked chestnut fur, teal scarf, brass crescent locket, warm-gray studio, fixed three-quarter portrait camera, and soft directional lighting.",
  video: "No authenticated video generation tool was available in this workspace. The shipped experience uses static semantic artwork and CSS motion only when enabled.",
} as const;
