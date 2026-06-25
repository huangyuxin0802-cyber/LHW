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
  lastUpdated: string;
};

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
  lastUpdated: new Date().toISOString(),
};

export const PET_STORAGE_KEY = "lhw-ghost-pet";
