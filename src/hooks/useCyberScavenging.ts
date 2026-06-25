"use client";

import {
  buildScavengerBubble,
  CYBER_SCAVENGER_BUBBLE_MS,
  fireScavengerConfetti,
  getTrophyRoomTarget,
} from "@/lib/cyber-scavenging";
import { useAnimationControls, type AnimationDefinition } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type MotionControls = ReturnType<typeof useAnimationControls>;

export type CouponFlightState =
  | { phase: "hidden" }
  | {
      phase: "spawn" | "fly";
      from: { x: number; y: number };
      to: { x: number; y: number };
    };

type UseCyberScavengingOptions = {
  enabled: boolean;
  displayName: string;
  innerControls: MotionControls;
  outerControls: MotionControls;
  ghostButtonRef: RefObject<HTMLButtonElement | null>;
  onStart?: () => void;
  onComplete: () => void;
};

const pantingAnimation: AnimationDefinition = {
  y: [0, -10, 0],
  transition: {
    duration: 0.18,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

export function useCyberScavenging({
  enabled,
  displayName,
  innerControls,
  outerControls,
  ghostButtonRef,
  onStart,
  onComplete,
}: UseCyberScavengingOptions) {
  const startedRef = useRef(false);
  const [scavengerActive, setScavengerActive] = useState(false);
  const [scavengerBubble, setScavengerBubble] = useState<string | null>(null);
  const [couponFlight, setCouponFlight] = useState<CouponFlightState>({
    phase: "hidden",
  });

  const launchCoupon = useCallback(() => {
    const button = ghostButtonRef.current;
    if (!button) {
      onComplete();
      return;
    }

    const rect = button.getBoundingClientRect();
    const from = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height * 0.35,
    };
    const to = getTrophyRoomTarget();

    setCouponFlight({ phase: "spawn", from, to });
    void fireScavengerConfetti();

    window.setTimeout(() => {
      setCouponFlight({ phase: "fly", from, to });
    }, 420);

    window.setTimeout(() => {
      setCouponFlight({ phase: "hidden" });
      onComplete();
      setScavengerActive(false);
    }, 1500);
  }, [ghostButtonRef, onComplete]);

  const runScavengerReturn = useCallback(async () => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    onStart?.();
    setScavengerActive(true);
    setScavengerBubble(buildScavengerBubble(displayName));

    const bubbleTimer = window.setTimeout(() => {
      setScavengerBubble(null);
    }, CYBER_SCAVENGER_BUBBLE_MS);

    outerControls.set({ x: -500 });
    void innerControls.start(pantingAnimation);

    try {
      await outerControls.start({
        x: 0,
        transition: {
          duration: 2.35,
          ease: [0.16, 1, 0.3, 1],
        },
      });
    } catch {
      // animation interrupted
    }

    void innerControls.start({
      y: 0,
      transition: { duration: 0.2 },
    });
    void innerControls.start("idle");

    window.setTimeout(() => {
      launchCoupon();
    }, 350);

    return () => window.clearTimeout(bubbleTimer);
  }, [
    displayName,
    innerControls,
    launchCoupon,
    onStart,
    outerControls,
  ]);

  useEffect(() => {
    if (!enabled || startedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runScavengerReturn();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [enabled, runScavengerReturn]);

  return {
    scavengerActive,
    scavengerBubble,
    couponFlight,
  };
}
