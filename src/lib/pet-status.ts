import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_PET_STATUS,
  PET_AVATARS,
  PET_MOOD_STATES,
  PET_PERSONALITIES,
  PET_STORAGE_KEY,
  type PetAvatar,
  type PetMoodState,
  type PetPersonality,
  type PetStatus,
} from "@/types/pet";

export function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampDropFrequency(value: number) {
  return Math.max(10, Math.min(120, Math.round(value)));
}

export function getTodayDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isPetAvatar(value: string): value is PetAvatar {
  return (PET_AVATARS as readonly string[]).includes(value);
}

export function isPetMoodState(value: string): value is PetMoodState {
  return (PET_MOOD_STATES as readonly string[]).includes(value);
}

export function isPetPersonality(value: string): value is PetPersonality {
  return (PET_PERSONALITIES as readonly string[]).includes(value);
}

export function computeMoodState(hunger: number, energy: number): PetMoodState {
  if (hunger < 20) return "starving";
  if (hunger < 40) return "angry";
  if (energy < 20) return "tired";
  if (hunger >= 70 && energy >= 50) return "happy";
  return "neutral";
}

export function applyDailyLogin(pet: PetStatus, today = getTodayDateKey()): PetStatus {
  if (pet.lastLoginDate === today) {
    return clampPet({ ...pet, level: Math.max(1, pet.loginDays) });
  }

  const loginDays = pet.lastLoginDate ? pet.loginDays + 1 : pet.loginDays;

  return clampPet({
    ...pet,
    loginDays,
    lastLoginDate: today,
    level: loginDays,
    lastUpdated: new Date().toISOString(),
  });
}

export function clampPet(pet: PetStatus): PetStatus {
  const hunger = clampStat(pet.hunger);
  const energy = clampStat(pet.energy);
  const xp = Math.max(0, Math.round(pet.xp));
  const loginDays = Math.max(1, Math.round(pet.loginDays));

  return {
    ...pet,
    hunger,
    energy,
    xp,
    loginDays,
    level: loginDays,
    dropFrequency: clampDropFrequency(pet.dropFrequency),
    avatar: isPetAvatar(pet.avatar) ? pet.avatar : DEFAULT_PET_STATUS.avatar,
    personality: isPetPersonality(pet.personality)
      ? pet.personality
      : DEFAULT_PET_STATUS.personality,
    lastFoodEaten: pet.lastFoodEaten ?? "",
    lastLoginDate: pet.lastLoginDate ?? "",
    moodState: isPetMoodState(pet.moodState)
      ? pet.moodState
      : computeMoodState(hunger, energy),
    lastUpdated: pet.lastUpdated || new Date().toISOString(),
  };
}

function mapRowToPet(data: {
  id: string;
  personality: string;
  avatar?: string | null;
  hunger: number;
  energy: number;
  xp?: number | null;
  level?: number | null;
  login_days?: number | null;
  last_login_date?: string | null;
  drop_frequency?: number | null;
  last_food_eaten?: string | null;
  mood_state?: string | null;
  last_updated: string;
}): PetStatus {
  const loginDays = data.login_days ?? data.level ?? 1;
  const moodRaw = data.mood_state ?? "";

  return clampPet({
    id: data.id,
    personality: isPetPersonality(data.personality)
      ? data.personality
      : DEFAULT_PET_STATUS.personality,
    avatar:
      data.avatar && isPetAvatar(data.avatar)
        ? data.avatar
        : DEFAULT_PET_STATUS.avatar,
    hunger: data.hunger,
    energy: data.energy,
    xp: data.xp ?? 0,
    loginDays,
    level: loginDays,
    lastLoginDate: data.last_login_date ?? "",
    dropFrequency: data.drop_frequency ?? 30,
    lastFoodEaten: data.last_food_eaten ?? "",
    moodState: isPetMoodState(moodRaw)
      ? moodRaw
      : computeMoodState(data.hunger, data.energy),
    lastUpdated: data.last_updated,
  });
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
      PetStatus & {
        last_food_eaten?: string;
        mood_state?: string;
        login_days?: number;
        last_login_date?: string;
        drop_frequency?: number;
      }
    >;

    const moodRaw = parsed.moodState ?? parsed.mood_state ?? "";
    const loginDays =
      parsed.loginDays ?? parsed.login_days ?? DEFAULT_PET_STATUS.loginDays;

    return clampPet({
      id: parsed.id,
      personality: parsed.personality ?? DEFAULT_PET_STATUS.personality,
      avatar: parsed.avatar ?? DEFAULT_PET_STATUS.avatar,
      hunger: parsed.hunger ?? DEFAULT_PET_STATUS.hunger,
      energy: parsed.energy ?? DEFAULT_PET_STATUS.energy,
      xp: parsed.xp ?? DEFAULT_PET_STATUS.xp,
      loginDays,
      level: parsed.level ?? loginDays,
      lastLoginDate:
        parsed.lastLoginDate ?? parsed.last_login_date ?? DEFAULT_PET_STATUS.lastLoginDate,
      dropFrequency:
        parsed.dropFrequency ?? parsed.drop_frequency ?? DEFAULT_PET_STATUS.dropFrequency,
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
      "id, personality, avatar, hunger, energy, xp, level, login_days, last_login_date, drop_frequency, last_food_eaten, mood_state, last_updated"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRowToPet(data);
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
      avatar: payload.avatar,
      hunger: payload.hunger,
      energy: payload.energy,
      xp: payload.xp,
      level: payload.loginDays,
      login_days: payload.loginDays,
      last_login_date: payload.lastLoginDate || null,
      drop_frequency: payload.dropFrequency,
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
