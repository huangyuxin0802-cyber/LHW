export const PET_PERSONALITIES = [
  "调皮捣蛋",
  "温柔治愈",
  "暴躁傲娇",
  "抑郁emo",
] as const;

export const PET_MOOD_STATES = [
  "happy",
  "starving",
  "angry",
  "tired",
  "neutral",
] as const;

export const PET_AVATARS = ["ghost", "puppy"] as const;

export type PetPersonality = (typeof PET_PERSONALITIES)[number];
export type PetMoodState = (typeof PET_MOOD_STATES)[number];
export type PetAvatar = (typeof PET_AVATARS)[number];

export type MemoryLogEntry = {
  date: string;
  content: string;
};

export type BackpackItem = {
  id: string;
  name: string;
  emoji: string;
  collectedAt: string;
};

export type PetStatus = {
  id?: string;
  personality: PetPersonality;
  avatar: PetAvatar;
  hunger: number;
  energy: number;
  xp: number;
  level: number;
  loginDays: number;
  lastLoginDate: string;
  dropFrequency: number;
  lastFoodEaten: string;
  moodState: PetMoodState;
  memoryLogs: MemoryLogEntry[];
  backpack: BackpackItem[];
  equippedItem: string;
  lastUpdated: string;
};

export const DEFAULT_MEMORY_LOGS: MemoryLogEntry[] = [
  {
    date: "2026-06-25",
    content: "主人说他最喜欢吃绿咖喱和牛腩",
  },
];

export const DEFAULT_PET_STATUS: PetStatus = {
  personality: "调皮捣蛋",
  avatar: "ghost",
  hunger: 50,
  energy: 100,
  xp: 0,
  level: 1,
  loginDays: 1,
  lastLoginDate: "",
  dropFrequency: 30,
  lastFoodEaten: "",
  moodState: "happy",
  memoryLogs: DEFAULT_MEMORY_LOGS,
  backpack: [],
  equippedItem: "",
  lastUpdated: new Date().toISOString(),
};

export const PET_STORAGE_KEY = "lhw-ghost-pet";
