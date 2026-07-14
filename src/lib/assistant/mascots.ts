export type AssistantCharacter =
  | "capybara"
  | "fox"
  | "owl";

export type AssistantMood =
  | "idle"
  | "qa"
  | "shy"
  | "sad"
  | "celebrate"
  | "loading_dance"
  | "warning"
  | "success";

export type AssistantMascotDefinition = {
  id: AssistantCharacter;
  name: string;
  src: string;
  description: string;
  defaultMood: AssistantMood;
  supportedMoods: AssistantMood[];
};

export const DEFAULT_ASSISTANT_CHARACTER = "capybara" satisfies AssistantCharacter;
export const DEFAULT_ASSISTANT_MOOD = "idle" satisfies AssistantMood;

export const assistantMoodLabels: Record<AssistantMood, string> = {
  idle: "Idle",
  qa: "Question help",
  shy: "Validation hint",
  sad: "Sad or revoked",
  celebrate: "Celebration",
  loading_dance: "Loading dance",
  warning: "Warning",
  success: "Success",
};

const allMoods: AssistantMood[] = [
  "idle",
  "qa",
  "shy",
  "sad",
  "celebrate",
  "loading_dance",
  "warning",
  "success",
];

export const assistantMascots: Record<AssistantCharacter, AssistantMascotDefinition> = {
  capybara: {
    id: "capybara",
    name: "Mira",
    src: "/assistant/mascots/capybara.svg",
    description: "A calm, grounded companion for quiet help and recovery moments.",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  fox: {
    id: "fox",
    name: "Rue",
    src: "/assistant/mascots/fox.svg",
    description: "An attentive companion for questions, validation hints, and gentle guidance.",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  owl: {
    id: "owl",
    name: "Noa",
    src: "/assistant/mascots/owl.svg",
    description: "A composed companion for warnings, knowledge, and careful decisions.",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
};
