"use client";

import { Dog, Ghost } from "lucide-react";
import styles from "./DesktopOrbBall.module.css";

export type OrbReaction = "idle" | "wiggle" | "bounce" | "droop" | "startled" | "happy";

export type DesktopOrbBallProps = {
  level?: number;
  avatar?: "ghost" | "puppy";
  reaction?: OrbReaction;
  bubbleText?: string | null;
  showUnreadDot?: boolean;
  className?: string;
};

const REACTION_CLASS: Record<OrbReaction, string | undefined> = {
  idle: undefined,
  wiggle: styles.coreWiggle,
  bounce: styles.coreBounce,
  droop: styles.coreDroop,
  startled: styles.coreStartled,
  happy: styles.coreHappy,
};

export default function DesktopOrbBall({
  level,
  avatar = "ghost",
  reaction = "idle",
  bubbleText,
  showUnreadDot = false,
  className,
}: DesktopOrbBallProps) {
  const MascotIcon = avatar === "puppy" ? Dog : Ghost;
  const reactionClass = REACTION_CLASS[reaction];
  const isPuppy = avatar === "puppy";

  return (
    <div
      className={`${styles.shell} ${isPuppy ? styles.shellPuppy : ""} ${className ?? ""}`}
      aria-label={
        showUnreadDot
          ? "桌面宠物，你有未读消息"
          : level != null
            ? `桌面宠物，等级 Lv.${level}`
            : "桌面宠物待机球"
      }
    >
      {showUnreadDot && <span className={styles.unreadDot} aria-hidden />}
      {bubbleText && <div className={styles.bubble}>{bubbleText}</div>}
      <div
        className={`${styles.core} ${isPuppy ? styles.corePuppy : ""} ${reactionClass ?? ""}`}
      >
        <div className={styles.mascot}>
          <MascotIcon
            className={`${styles.mascotIcon} ${isPuppy ? styles.mascotIconPuppy : ""}`}
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
        {level != null && (
          <div className={styles.levelBadge}>Lv.{level}</div>
        )}
      </div>
    </div>
  );
}
