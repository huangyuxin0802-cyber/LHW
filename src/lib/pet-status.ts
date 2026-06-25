import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_PET_STATUS,
  PET_PERSONALITIES,
  PET_STORAGE_KEY,
  type PetPersonality,
  type PetStatus,
} from "@/types/pet";

export function clampStat(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampPet(pet: PetStatus): PetStatus {
  return {
    ...pet,
    hunger: clampStat(pet.hunger),
    energy: clampStat(pet.energy),
    personality: isPetPersonality(pet.personality)
      ? pet.personality
      : DEFAULT_PET_STATUS.personality,
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

    const parsed = JSON.parse(raw) as Partial<PetStatus>;
    return clampPet({
      id: parsed.id,
      personality: parsed.personality ?? DEFAULT_PET_STATUS.personality,
      hunger: parsed.hunger ?? DEFAULT_PET_STATUS.hunger,
      energy: parsed.energy ?? DEFAULT_PET_STATUS.energy,
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
    .select("id, personality, hunger, energy, last_updated")
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
      last_updated: payload.lastUpdated,
    },
    { onConflict: "user_id" }
  );
}

export function applyOfflineDecay(pet: PetStatus, now = Date.now()): PetStatus {
  const last = new Date(pet.lastUpdated).getTime();
  const elapsedMinutes = Math.floor((now - last) / 60_000);

  if (elapsedMinutes <= 0) {
    return pet;
  }

  return clampPet({
    ...pet,
    hunger: pet.hunger - elapsedMinutes,
    energy: pet.energy - elapsedMinutes,
    lastUpdated: new Date(now).toISOString(),
  });
}
