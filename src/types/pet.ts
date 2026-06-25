export const PET_PERSONALITIES = [
  "调皮捣蛋",
  "温柔治愈",
  "暴躁傲娇",
  "抑郁emo",
] as const;

export type PetPersonality = (typeof PET_PERSONALITIES)[number];

export type PetStatus = {
  id?: string;
  personality: PetPersonality;
  hunger: number;
  energy: number;
  lastUpdated: string;
};

export const DEFAULT_PET_STATUS: PetStatus = {
  personality: "调皮捣蛋",
  hunger: 50,
  energy: 100,
  lastUpdated: new Date().toISOString(),
};

export const PET_STORAGE_KEY = "lhw-ghost-pet";
