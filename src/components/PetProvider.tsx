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
  feedPet: (amount?: number) => void;
  patchPet: (patch: Partial<Pick<PetStatus, "hunger" | "energy">>) => void;
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
      setPet((prev) =>
        clampPet({
          ...prev,
          hunger: prev.hunger - 1,
          energy: prev.energy - 1,
          lastUpdated: new Date().toISOString(),
        })
      );
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

  const feedPet = useCallback((amount = 20) => {
    setPet((prev) =>
      clampPet({
        ...prev,
        hunger: prev.hunger + amount,
        lastUpdated: new Date().toISOString(),
      })
    );
  }, []);

  const patchPet = useCallback(
    (patch: Partial<Pick<PetStatus, "hunger" | "energy">>) => {
      setPet((prev) =>
        clampPet({
          ...prev,
          ...patch,
          lastUpdated: new Date().toISOString(),
        })
      );
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
