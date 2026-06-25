import { getTodayDateKey } from "@/lib/pet-status";
import type { PetStatus } from "@/types/pet";

export const CYBER_SCAVENGER_COUPON_ID = "hidden-coupon-50";
export const CYBER_SCAVENGER_HOURS_THRESHOLD = 8;
export const CYBER_SCAVENGER_BUBBLE_MS = 8_000;

export const CYBER_SCAVENGER_COUPON = {
  id: CYBER_SCAVENGER_COUPON_ID,
  name: "50% 隐藏券",
  emoji: "🎫",
} as const;

export function getHoursOffline(pet: PetStatus): number {
  const anchor =
    pet.lastScavengerAt ||
    pet.lastUpdated ||
    (pet.lastLoginDate ? `${pet.lastLoginDate}T12:00:00` : "");

  if (!anchor) {
    return 0;
  }

  const lastMs = new Date(anchor).getTime();
  if (Number.isNaN(lastMs)) {
    return 0;
  }

  return (Date.now() - lastMs) / (1000 * 60 * 60);
}

export function hasScavengerCoupon(pet: PetStatus) {
  return pet.backpack.some((item) => item.id === CYBER_SCAVENGER_COUPON_ID);
}

export function shouldTriggerCyberScavenger(pet: PetStatus) {
  if (hasScavengerCoupon(pet)) {
    return false;
  }

  return getHoursOffline(pet) > CYBER_SCAVENGER_HOURS_THRESHOLD;
}

export function buildScavengerBubble(displayName: string) {
  return `${displayName} 你终于来啦！我昨晚在网上瞎逛，偷偷帮你扒出了一张极其稀有的 50% 隐藏券！快看地图！`;
}

export function createScavengerRewardPatch(now = new Date()) {
  const iso = now.toISOString();

  return {
    lastLoginDate: getTodayDateKey(now),
    lastScavengerAt: iso,
    lastUpdated: iso,
    coupon: {
      id: CYBER_SCAVENGER_COUPON_ID,
      name: CYBER_SCAVENGER_COUPON.name,
      emoji: CYBER_SCAVENGER_COUPON.emoji,
      collectedAt: iso,
    },
  };
}

export async function fireScavengerConfetti() {
  const confetti = (await import("canvas-confetti")).default;

  confetti({
    particleCount: 140,
    spread: 78,
    startVelocity: 42,
    origin: { y: 0.72 },
    colors: ["#fbbf24", "#f59e0b", "#a78bfa", "#34d399", "#ffffff"],
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 90,
      angle: 60,
      spread: 55,
      origin: { x: 0.12, y: 0.65 },
      colors: ["#fde68a", "#fcd34d", "#c4b5fd"],
    });
    confetti({
      particleCount: 90,
      angle: 120,
      spread: 55,
      origin: { x: 0.88, y: 0.65 },
      colors: ["#fde68a", "#fcd34d", "#c4b5fd"],
    });
  }, 220);
}

export function getTrophyRoomTarget() {
  if (typeof window === "undefined") {
    return { x: 48, y: 48 };
  }

  const anchor = document.querySelector("[data-trophy-room-anchor]");
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  return { x: window.innerWidth - 48, y: 48 };
}
