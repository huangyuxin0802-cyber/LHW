import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_PET_STATUS,
  PET_MOOD_STATES,
  PET_PERSONALITIES,
  PET_STORAGE_KEY,
  type PetMoodState,
  type PetPersonality,
  type PetStatus,
} from "@/types/pet";

export function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export function isPetMoodState(value: string): value is PetMoodState {
  return (PET_MOOD_STATES as readonly string[]).includes(value);
}

export function computeMoodState(hunger: number, energy: number): PetMoodState {
  if (hunger < 20) {
    return "starving";
  }
  if (hunger < 40) {
    return "angry";
  }
  if (energy < 20) {
    return "tired";
  }
  if (hunger >= 70 && energy >= 50) {
    return "happy";
  }
  return "neutral";
}

export function clampPet(pet: PetStatus): PetStatus {
  const hunger = clampStat(pet.hunger);
  const energy = clampStat(pet.energy);
  const xp = Math.max(0, Math.round(pet.xp));

  return {
    ...pet,
    hunger,
    energy,
    xp,
    level: levelFromXp(xp),
    personality: isPetPersonality(pet.personality)
      ? pet.personality
      : DEFAULT_PET_STATUS.personality,
    lastFoodEaten: pet.lastFoodEaten ?? "",
    moodState: isPetMoodState(pet.moodState)
      ? pet.moodState
      : computeMoodState(hunger, energy),
    lastUpdated: pet.lastUpdated || new Date().toISOString(),
  };
}

export function isPetPersonality(value: string): value is PetPersonality {
  return (PET_PERSONALITIES as readonly string[]).includes(value);
}

export function loadPetFromStorage(): PetStatus {
  if (typeof window === "undefined") {
    return DEFAULT_PET_STATUS;
  }

  try {
    const raw = localStorage.getItem(PET_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PET_STATUS;
    }

    const parsed = JSON.parse(raw) as Partial<
      PetStatus & { last_food_eaten?: string; mood_state?: string }
    >;

    const moodRaw = parsed.moodState ?? parsed.mood_state ?? "";

    return clampPet({
      id: parsed.id,
      personality: parsed.personality ?? DEFAULT_PET_STATUS.personality,
      hunger: parsed.hunger ?? DEFAULT_PET_STATUS.hunger,
      energy: parsed.energy ?? DEFAULT_PET_STATUS.energy,
      xp: parsed.xp ?? DEFAULT_PET_STATUS.xp,
      level: parsed.level ?? DEFAULT_PET_STATUS.level,
      lastFoodEaten:
        parsed.lastFoodEaten ??
        parsed.last_food_eaten ??
        DEFAULT_PET_STATUS.lastFoodEaten,
      moodState: isPetMoodState(moodRaw)
        ? moodRaw
        : computeMoodState(
            parsed.hunger ?? DEFAULT_PET_STATUS.hunger,
            parsed.energy ?? DEFAULT_PET_STATUS.energy
          ),
      lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
    });
  } catch {
    return DEFAULT_PET_STATUS;
  }
}

export function savePetToStorage(pet: PetStatus) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(clampPet(pet)));
}

export async function loadPetFromSupabase(): Promise<PetStatus | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("pet_status")
    .select(
      "id, personality, hunger, energy, xp, level, last_food_eaten, mood_state, last_updated"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return clampPet({
    id: data.id,
    personality: data.personality,
    hunger: data.hunger,
    energy: data.energy,
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    lastFoodEaten: data.last_food_eaten ?? "",
    moodState: isPetMoodState(data.mood_state ?? "")
      ? data.mood_state
      : computeMoodState(data.hunger, data.energy),
    lastUpdated: data.last_updated,
  });
}

export async function savePetToSupabase(pet: PetStatus) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const payload = clampPet(pet);

  await supabase.from("pet_status").upsert(
    {
      id: payload.id,
      user_id: user.id,
      personality: payload.personality,
      hunger: payload.hunger,
      energy: payload.energy,
      xp: payload.xp,
      level: payload.level,
      last_food_eaten: payload.lastFoodEaten || null,
      mood_state: payload.moodState,
      last_updated: payload.lastUpdated,
    },
    { onConflict: "user_id" }
  );
}

export function applyOfflineDecay(pet: PetStatus, now = Date.now()): PetStatus {
  const last = new Date(pet.lastUpdated).getTime();
  const elapsedMinutes = Math.floor((now - last) / 60_000);

  if (elapsedMinutes <= 0) {
    return clampPet(pet);
  }

  const hunger = pet.hunger - elapsedMinutes;
  const energy = pet.energy - elapsedMinutes;

  return clampPet({
    ...pet,
    hunger,
    energy,
    moodState: computeMoodState(hunger, energy),
    lastUpdated: new Date(now).toISOString(),
  });
}
