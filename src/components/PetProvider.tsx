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
  applyDailyLogin,
  applyOfflineDecay,
  clampPet,
  computeMoodState,
  getTodayDateKey,
  loadPetFromStorage,
  loadPetFromSupabase,
  savePetToStorage,
  savePetToSupabase,
} from "@/lib/pet-status";
import {
  createScavengerRewardPatch,
  CYBER_SCAVENGER_COUPON_ID,
  hasScavengerCoupon,
  shouldTriggerCyberScavenger,
} from "@/lib/cyber-scavenging";
import type {
  PetAvatar,
  PetPersonality,
  PetStatus,
} from "@/types/pet";

type PetContextValue = {
  pet: PetStatus;
  hydrated: boolean;
  setPersonality: (personality: PetPersonality) => void;
  setAvatar: (avatar: PetAvatar) => void;
  setDropFrequency: (seconds: number) => void;
  setEquippedItem: (name: string) => void;
  addMemoryLog: (content: string, date?: string) => void;
  wakePet: () => void;
  feedPet: (foodLabel: string, hungerAmount?: number, energyAmount?: number) => void;
  scavengerPending: boolean;
  claimCyberScavengerReward: () => void;
  patchPet: (
    patch: Partial<Pick<PetStatus, "hunger" | "energy" | "moodState">>
  ) => void;
};

const PetContext = createContext<PetContextValue | null>(null);

export function PetProvider({ children }: { children: React.ReactNode }) {
  const [pet, setPet] = useState<PetStatus>(() => loadPetFromStorage());
  const [hydrated, setHydrated] = useState(false);
  const [scavengerPending, setScavengerPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const rawLocal = loadPetFromStorage();
      const pendingLocal = shouldTriggerCyberScavenger(rawLocal);

      const local = applyDailyLogin(applyOfflineDecay(rawLocal));
      if (!cancelled) {
        setPet(local);
        setScavengerPending(pendingLocal);
      }

      const remote = await loadPetFromSupabase();
      if (!cancelled && remote) {
        const pendingRemote = shouldTriggerCyberScavenger(remote);
        const merged = applyDailyLogin(
          applyOfflineDecay(
            clampPet({
              ...remote,
              hunger: Math.min(local.hunger, remote.hunger),
              energy: Math.min(local.energy, remote.energy),
              xp: Math.max(local.xp, remote.xp),
              loginDays: Math.max(local.loginDays, remote.loginDays),
              memoryLogs:
                remote.memoryLogs.length >= local.memoryLogs.length
                  ? remote.memoryLogs
                  : local.memoryLogs,
              backpack:
                remote.backpack.length >= local.backpack.length
                  ? remote.backpack
                  : local.backpack,
            })
          )
        );
        setPet(merged);
        setScavengerPending(
          (pendingLocal || pendingRemote) && !hasScavengerCoupon(merged)
        );
      } else if (!cancelled) {
        setPet((prev) => applyDailyLogin(prev));
        setScavengerPending(pendingLocal && !hasScavengerCoupon(local));
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

  const setAvatar = useCallback((avatar: PetAvatar) => {
    setPet((prev) =>
      clampPet({
        ...prev,
        avatar,
        lastUpdated: new Date().toISOString(),
      })
    );
  }, []);

  const setDropFrequency = useCallback((seconds: number) => {
    setPet((prev) =>
      clampPet({
        ...prev,
        dropFrequency: seconds,
        lastUpdated: new Date().toISOString(),
      })
    );
  }, []);

  const setEquippedItem = useCallback((name: string) => {
    setPet((prev) =>
      clampPet({
        ...prev,
        equippedItem: prev.equippedItem === name ? "" : name,
        lastUpdated: new Date().toISOString(),
      })
    );
  }, []);

  const addMemoryLog = useCallback((content: string, date = getTodayDateKey()) => {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }

    setPet((prev) => {
      const exists = prev.memoryLogs.some(
        (log) => log.date === date && log.content === trimmed
      );
      if (exists) {
        return prev;
      }

      return clampPet({
        ...prev,
        memoryLogs: [{ date, content: trimmed }, ...prev.memoryLogs].slice(
          0,
          50
        ),
        lastUpdated: new Date().toISOString(),
      });
    });
  }, []);

  const wakePet = useCallback(() => {
    setPet((prev) => {
      const energy = Math.max(35, prev.energy);
      return clampPet({
        ...prev,
        energy,
        moodState: computeMoodState(prev.hunger, energy),
        lastUpdated: new Date().toISOString(),
      });
    });
  }, []);

  const feedPet = useCallback(
    (foodLabel: string, hungerAmount = 15, energyAmount = 10) => {
      setPet((prev) => {
        const hunger = prev.hunger + hungerAmount;
        const energy = prev.energy + energyAmount;
        const xp = prev.xp + 10;

        return clampPet({
          ...prev,
          hunger,
          energy,
          xp,
          lastFoodEaten: foodLabel,
          moodState: computeMoodState(hunger, energy),
          lastUpdated: new Date().toISOString(),
        });
      });
    },
    []
  );

  const claimCyberScavengerReward = useCallback(() => {
    const patch = createScavengerRewardPatch();

    setPet((prev) => {
      if (prev.backpack.some((item) => item.id === CYBER_SCAVENGER_COUPON_ID)) {
        return clampPet({
          ...prev,
          lastLoginDate: patch.lastLoginDate,
          lastScavengerAt: patch.lastScavengerAt,
          lastUpdated: patch.lastUpdated,
        });
      }

      return clampPet({
        ...prev,
        lastLoginDate: patch.lastLoginDate,
        lastScavengerAt: patch.lastScavengerAt,
        lastUpdated: patch.lastUpdated,
        backpack: [...prev.backpack, patch.coupon],
      });
    });
    setScavengerPending(false);
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
      setAvatar,
      setDropFrequency,
      setEquippedItem,
      addMemoryLog,
      wakePet,
      feedPet,
      scavengerPending,
      claimCyberScavengerReward,
      patchPet,
    }),
    [
      pet,
      hydrated,
      setPersonality,
      setAvatar,
      setDropFrequency,
      setEquippedItem,
      addMemoryLog,
      wakePet,
      feedPet,
      scavengerPending,
      claimCyberScavengerReward,
      patchPet,
    ]
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
