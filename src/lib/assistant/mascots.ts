export const assistantCharacterIds = [
  "capybara",
  "fox",
  "owl",
  "panda",
  "brown_bear",
  "polar_teddy",
  "dinosaur",
  "parrot",
  "rabbit",
  "deer",
  "cat",
  "puppy",
  "penguin",
  "koala",
  "seal",
  "red_panda",
  "flight_attendant",
  "doctor",
  "engineer",
  "baby_chibi",
] as const;

export type AssistantCharacter = (typeof assistantCharacterIds)[number];

export type AssistantMascotGroup = "animals" | "chibi_roles";

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
  personalityLabel: string;
  group: AssistantMascotGroup;
  defaultMood: AssistantMood;
  supportedMoods: AssistantMood[];
};

export const DEFAULT_ASSISTANT_CHARACTER = "capybara" satisfies AssistantCharacter;
export const DEFAULT_ASSISTANT_MOOD = "idle" satisfies AssistantMood;

export const assistantMascotGroupLabels: Record<AssistantMascotGroup, string> = {
  animals: "Animals",
  chibi_roles: "Chibi roles",
};

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
    personalityLabel: "Calm guide",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  fox: {
    id: "fox",
    name: "Rue",
    src: "/assistant/mascots/fox.svg",
    description: "An attentive companion for questions, validation hints, and gentle guidance.",
    personalityLabel: "Clever helper",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  owl: {
    id: "owl",
    name: "Noa",
    src: "/assistant/mascots/owl.svg",
    description: "A composed companion for warnings, knowledge, and careful decisions.",
    personalityLabel: "Quiet advisor",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  panda: {
    id: "panda",
    name: "Luma",
    src: "/assistant/mascots/panda.svg",
    description: "A gentle listener for slower moments, small doubts, and soft reassurance.",
    personalityLabel: "Gentle listener",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  brown_bear: {
    id: "brown_bear",
    name: "Bruno",
    src: "/assistant/mascots/brown-bear.svg",
    description: "A steady companion for access checks, warnings, and grounded next steps.",
    personalityLabel: "Steady guardian",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  polar_teddy: {
    id: "polar_teddy",
    name: "Lumi",
    src: "/assistant/mascots/polar-teddy.svg",
    description: "A soft comfort for uncertain states, revoked access, and quiet pauses.",
    personalityLabel: "Soft comfort",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  dinosaur: {
    id: "dinosaur",
    name: "Pip",
    src: "/assistant/mascots/dinosaur.svg",
    description: "A curious explorer for discovering albums and trying unfamiliar controls.",
    personalityLabel: "Curious explorer",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  parrot: {
    id: "parrot",
    name: "Sol",
    src: "/assistant/mascots/parrot.svg",
    description: "A bright messenger for contact prompts, replies, and friendly reminders.",
    personalityLabel: "Bright messenger",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  rabbit: {
    id: "rabbit",
    name: "Nini",
    src: "/assistant/mascots/rabbit.svg",
    description: "A kind nudge for form hints, incomplete fields, and gentle validation.",
    personalityLabel: "Kind nudge",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  deer: {
    id: "deer",
    name: "Aster",
    src: "/assistant/mascots/deer.svg",
    description: "A graceful watcher for quiet browsing, portfolio reading, and calm guidance.",
    personalityLabel: "Graceful watcher",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  cat: {
    id: "cat",
    name: "Miso",
    src: "/assistant/mascots/cat.svg",
    description: "A cozy companion for personal settings, profile edits, and small decisions.",
    personalityLabel: "Cozy companion",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  puppy: {
    id: "puppy",
    name: "Bento",
    src: "/assistant/mascots/puppy.svg",
    description: "A loyal helper for requests, saved choices, and friendly confirmation states.",
    personalityLabel: "Loyal helper",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  penguin: {
    id: "penguin",
    name: "Poko",
    src: "/assistant/mascots/penguin.svg",
    description: "A cool navigator for moving between sections without losing your place.",
    personalityLabel: "Cool navigator",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  koala: {
    id: "koala",
    name: "Koa",
    src: "/assistant/mascots/koala.svg",
    description: "A sleepy strategist for low-motion guidance and reduced-distraction modes.",
    personalityLabel: "Sleepy strategist",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  seal: {
    id: "seal",
    name: "Sora",
    src: "/assistant/mascots/seal.svg",
    description: "A warm swimmer for loading states, gentle waiting, and smooth transitions.",
    personalityLabel: "Warm swimmer",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  red_panda: {
    id: "red_panda",
    name: "Rumi",
    src: "/assistant/mascots/red-panda.svg",
    description: "A playful curator for albums, favorite moments, and delightful success states.",
    personalityLabel: "Playful curator",
    group: "animals",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  flight_attendant: {
    id: "flight_attendant",
    name: "Mina",
    src: "/assistant/mascots/flight-attendant.svg",
    description: "A polished host for onboarding, navigation, and first-time visitor guidance.",
    personalityLabel: "Polished host",
    group: "chibi_roles",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  doctor: {
    id: "doctor",
    name: "Yuna",
    src: "/assistant/mascots/doctor.svg",
    description: "A careful helper for warnings, recovery states, and clear next steps.",
    personalityLabel: "Careful helper",
    group: "chibi_roles",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  engineer: {
    id: "engineer",
    name: "Taro",
    src: "/assistant/mascots/engineer.svg",
    description: "A practical builder for settings, system hints, and structured choices.",
    personalityLabel: "Practical builder",
    group: "chibi_roles",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
  baby_chibi: {
    id: "baby_chibi",
    name: "Bibi",
    src: "/assistant/mascots/baby-chibi.svg",
    description: "A tiny cheer for celebration, saved settings, and friendly encouragement.",
    personalityLabel: "Tiny cheer",
    group: "chibi_roles",
    defaultMood: DEFAULT_ASSISTANT_MOOD,
    supportedMoods: allMoods,
  },
};
