"use client";

import { motion } from "framer-motion";
import type { CouponFlightState } from "@/hooks/useCyberScavenging";

type ScavengerCouponDropProps = {
  flight: CouponFlightState;
};

export default function ScavengerCouponDrop({ flight }: ScavengerCouponDropProps) {
  if (flight.phase === "hidden") {
    return null;
  }

  const { from, to, phase } = flight;

  return (
    <motion.div
      className="pointer-events-none fixed z-[2147483647] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      initial={{
        left: from.x,
        top: from.y,
        scale: 0.2,
        opacity: 0,
        rotate: -18,
      }}
      animate={
        phase === "spawn"
          ? {
              left: from.x,
              top: from.y - 28,
              scale: 1.15,
              opacity: 1,
              rotate: 0,
            }
          : {
              left: to.x,
              top: to.y,
              scale: 0.35,
              opacity: 0.15,
              rotate: 18,
            }
      }
      transition={
        phase === "spawn"
          ? { type: "spring", stiffness: 420, damping: 18 }
          : { duration: 0.88, ease: [0.22, 1, 0.36, 1] }
      }
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-amber-300/40 blur-md" />
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-500 px-4 py-3 text-center shadow-[0_0_40px_rgba(251,191,36,0.75)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-950/70">
          Rare Drop
        </p>
        <p className="mt-1 text-2xl">🎫</p>
        <p className="mt-1 text-sm font-black text-amber-950">50% OFF</p>
      </div>
    </motion.div>
  );
}
