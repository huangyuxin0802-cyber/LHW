"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyOfflineDecay,
  clampPet,
  computeMoodState,
  loadPetFromStorage,
  loadPetFromSupabase,
  savePetToStorage,
  savePetToSupabase,
} from "@/lib/pet-status";
import type { PetPersonality, PetStatus } from "@/types/pet";

type PetContextValue = {
  pet: PetStatus;
  hydrated: boolean;
  setPersonality: (personality: PetPersonality) => void;
  feedPet: (foodLabel: string, hungerAmount?: number) => void;
  patchPet: (
    patch: Partial<Pick<PetStatus, "hunger" | "energy" | "moodState">>
  ) => void;
};

const PetContext = createContext<PetContextValue | null>(null);

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [pet, setPet] = useState<PetStatus>(() => loadPetFromStorage());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = applyOfflineDecay(loadPetFromStorage());
      if (!cancelled) {
        setPet(local);
      }

      const remote = await loadPetFromSupabase();
      if (!cancelled && remote) {
        const merged = applyOfflineDecay(
          clampPet({
            ...remote,
            hunger: Math.min(local.hunger, remote.hunger),
            energy: Math.min(local.energy, remote.energy),
            xp: Math.max(local.xp, remote.xp),
          })
        );
        setPet(merged);
      }

      if (!cancelled) {
        setHydrated(true);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    savePetToStorage(pet);
    void savePetToSupabase(pet);
  }, [pet, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const timer = window.setInterval(() => {
      setPet((prev) => {
        const hunger = prev.hunger - 1;
        const energy = prev.energy - 1;

        return clampPet({
          ...prev,
          hunger,
          energy,
          moodState: computeMoodState(hunger, energy),
          lastUpdated: new Date().toISOString(),
        });
      });
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [hydrated]);

  const setPersonality = useCallback((personality: PetPersonality) => {
    setPet((prev) =>
      clampPet({
        ...prev,
        personality,
        lastUpdated: new Date().toISOString(),
      })
    );
  }, []);

  const feedPet = useCallback((foodLabel: string, hungerAmount = 15) => {
    setPet((prev) => {
      const hunger = prev.hunger + hungerAmount;
      const xp = prev.xp + 10;

      return clampPet({
        ...prev,
        hunger,
        xp,
        lastFoodEaten: foodLabel,
        moodState: computeMoodState(hunger, prev.energy),
        lastUpdated: new Date().toISOString(),
      });
    });
  }, []);

  const patchPet = useCallback(
    (
      patch: Partial<Pick<PetStatus, "hunger" | "energy" | "moodState">>
    ) => {
      setPet((prev) => {
        const hunger = patch.hunger ?? prev.hunger;
        const energy = patch.energy ?? prev.energy;

        return clampPet({
          ...prev,
          ...patch,
          moodState: patch.moodState ?? computeMoodState(hunger, energy),
          lastUpdated: new Date().toISOString(),
        });
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      pet,
      hydrated,
      setPersonality,
      feedPet,
      patchPet,
    }),
    [pet, hydrated, setPersonality, feedPet, patchPet]
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet() {
  const ctx = useContext(PetContext);
  if (!ctx) {
    throw new Error("usePet must be used within PetProvider");
  }
  return ctx;
}
