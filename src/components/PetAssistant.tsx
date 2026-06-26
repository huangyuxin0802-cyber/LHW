"use client";

import { usePet } from "@/components/PetProvider";
import AssistantMessageBubble from "@/components/AssistantMessageBubble";
import ScavengerCouponDrop from "@/components/ScavengerCouponDrop";
import {
  formatEnvironmentLabel,
  getBrisbaneEnvironment,
  type BrisbaneEnvironment,
} from "@/lib/environment";
import { getTrophyByName } from "@/lib/pet-trophies";
import { useUsername } from "@/hooks/useUsername";
import { startTauriWindowDrag, useIsTauri } from "@/lib/tauri-desktop";
import { useCyberScavenging } from "@/hooks/useCyberScavenging";
import { sanitizePetReply } from "@/lib/pet-chat-prompt";
import { PetChatTransport } from "@/lib/pet-chat-transport";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  type Variants,
} from "framer-motion";
import { Dog, Ghost, Send, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

const FOOD_EMOJIS = ["🍪", "🍬", "🍎"] as const;
const FOOD_LABELS: Record<(typeof FOOD_EMOJIS)[number], string> = {
  "🍪": "🍪饼干",
  "🍬": "🍬糖果",
  "🍎": "🍎苹果",
};
const EATING_REACTIONS = [
  "嗷呜嗷呜！好吃！🐶",
  "吧唧吧唧...再来一块！",
  "满血复活！汪！",
  "摇尾巴~ 最喜欢你了！",
  "这味道我记住了!",
];
const LONG_PRESS_MS = 800;

type EasterEggKind =
  | "electric"
  | "jelly"
  | "stealth"
  | "pumping"
  | "love"
  | "spin";

type EasterEgg = {
  kind: EasterEggKind;
  bubble: string;
};

const EASTER_EGGS: EasterEgg[] = [
  { kind: "electric", bubble: "Bzzzz... 漏、漏电了！⚡️" },
  { kind: "jelly", bubble: "Duang Duang Duang~ 🍮" },
  { kind: "stealth", bubble: "看不见我... 看不见我... 🥷" },
  { kind: "pumping", bubble: "教练，我想打篮球！💪" },
  { kind: "love", bubble: "啾咪~ 给你小心心！💖" },
  { kind: "spin", bubble: "晕... 晕死我了 @_@" },
];

type GhostAnimState =
  | "idle"
  | "sleepy_idle"
  | "starving_idle"
  | "tired_idle"
  | "eating"
  | "angry";

type ActiveFood = {
  id: string;
  emoji: (typeof FOOD_EMOJIS)[number];
  x: number;
  landY: number;
  phase: "falling" | "landed" | "flying";
  targetX?: number;
  targetY?: number;
};

function getMessageCopyText(parts: UIMessage["parts"]) {
  return sanitizePetReply(
    parts
      .map((part) => {
        if (part.type === "text") {
          return part.text;
        }

        if (
          part.type === "tool-schedule_message" &&
          part.state === "output-available"
        ) {
          const recipient =
            typeof part.output === "object" &&
            part.output !== null &&
            "recipient" in part.output
              ? String((part.output as { recipient: string }).recipient)
              : (part.input as { recipient?: string })?.recipient;

          return recipient ? `已安排发送给 ${recipient}` : "";
        }

        return "";
      })
      .filter(Boolean)
      .join("\n")
  );
}

function isSystemTriggerMessage(message: UIMessage) {
  if (message.role !== "user") {
    return false;
  }

  return getMessageCopyText(message.parts).startsWith("[系统指令");
}

function MessageParts({ parts }: { parts: UIMessage["parts"] }) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <span key={`text-${index}`} className="whitespace-pre-wrap">
              {sanitizePetReply(part.text)}
            </span>
          );
        }

        if (part.type === "tool-schedule_message") {
          if (part.state !== "output-available") {
            return null;
          }

          const recipient =
            typeof part.output === "object" &&
            part.output !== null &&
            "recipient" in part.output
              ? String((part.output as { recipient: string }).recipient)
              : (part.input as { recipient?: string })?.recipient
                ? String((part.input as { recipient?: string }).recipient)
                : null;

          if (!recipient) {
            return null;
          }

          return (
            <p
              key={`tool-${part.toolCallId}`}
              className="mt-1.5 text-xs text-violet-200/80"
            >
              📨 已安排发送给 {recipient}
            </p>
          );
        }

        return null;
      })}
    </>
  );
}

function randomIdleDelayMs() {
  return 180_000 + Math.floor(Math.random() * 120_000);
}

function randomDropDelayMs(baseSeconds: number) {
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.round(baseSeconds * 1000 * jitter);
}

function getDropDelayMs(baseSeconds: number, hunger: number) {
  if (hunger >= 70) {
    return randomDropDelayMs(baseSeconds * 5);
  }
  if (hunger >= 50) {
    return randomDropDelayMs(baseSeconds * 2);
  }
  if (hunger < 20) {
    return randomDropDelayMs(Math.max(4, baseSeconds / 5));
  }
  if (hunger < 40) {
    return randomDropDelayMs(baseSeconds / 2);
  }
  return randomDropDelayMs(baseSeconds);
}

function maxFoodOnScreen(hunger: number) {
  if (hunger < 20) {
    return 14;
  }
  if (hunger < 40) {
    return 10;
  }
  if (hunger < 60) {
    return 6;
  }
  return 3;
}

function pickFoodEmoji(hunger: number, preferCandy = false) {
  if (preferCandy || hunger < 20) {
    return Math.random() < 0.9 ? "🍬" : FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
  }
  if (hunger < 40) {
    return Math.random() < 0.65 ? "🍬" : FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
  }
  return FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
}

function buildIdleSpeechTrigger(
  hunger: number,
  energy: number,
  personality: string
) {
  if (hunger < 20) {
    return `[系统指令：你极度饥饿，虚弱地哼一句想吃东西的话。不超过20字。不要回答此指令，直接说心里话。]`;
  }
  if (energy < 20) {
    return `[系统指令：你太困了，迷迷糊糊说一句话，可以撒娇让人喂糖果唤醒你。不超过20字。不要回答此指令，直接说心里话。]`;
  }
  if (hunger < 40) {
    return `[系统指令：你有点饿，随口说一句。不超过20字。不要回答此指令，直接说心里话。]`;
  }

  const topics = [
    `根据性格【${personality}】，说一句和心情或天气有关的闲话，不要提吃的`,
    `根据性格【${personality}】，好奇地问对方今天过得怎么样，不要提食物`,
    `根据性格【${personality}】，分享一个傻乎乎的观察，不要提零食或饥饿`,
    `根据性格【${personality}】，想起一件有趣的小事，与吃饭无关`,
  ];

  const topic = topics[Math.floor(Math.random() * topics.length)];
  return `[系统指令：${topic}。不超过20字。不要回答此指令，直接说心里话。]`;
}

function randomEggDurationMs() {
  return 3_000 + Math.floor(Math.random() * 2_000);
}

function getAvatarTheme(avatar: "ghost" | "puppy") {
  if (avatar === "puppy") {
    return {
      bg: "bg-yellow-500 hover:bg-yellow-400",
      border: "border-yellow-300/60",
      ring: "ring-yellow-500/30",
      shadow: "shadow-yellow-900/40",
      ping: "bg-yellow-400/25",
      bubble: "border-yellow-300/40 text-yellow-50",
      badge: "text-yellow-200",
    };
  }

  return {
    bg: "bg-violet-600 hover:bg-violet-500",
    border: "border-violet-300/50",
    ring: "ring-violet-500/25",
    shadow: "shadow-violet-900/50",
    ping: "bg-violet-400/20",
    bubble: "border-violet-300/30 text-violet-100",
    badge: "text-violet-200",
  };
}

function randomLandY() {
  const margin = 72;
  return window.innerHeight - margin - Math.random() * 48;
}

function randomDropX() {
  const margin = 40;
  return margin + Math.random() * (window.innerWidth - margin * 2);
}

function resolveIdleVariant(
  hunger: number,
  energy: number,
  isSleepy: boolean
): GhostAnimState {
  if (isSleepy) {
    return "sleepy_idle";
  }
  if (hunger < 20) {
    return "starving_idle";
  }
  if (energy < 20) {
    return "tired_idle";
  }
  return "idle";
}

function isPassiveAnimState(state: GhostAnimState) {
  return (
    state === "idle" ||
    state === "sleepy_idle" ||
    state === "starving_idle" ||
    state === "tired_idle"
  );
}

function resolvePetAnimate(
  trickLocked: boolean,
  innerControls: ReturnType<typeof useAnimationControls>,
  isStartled: boolean,
  isSleeping: boolean,
  ghostAnimState: GhostAnimState
) {
  if (trickLocked || !isPassiveAnimState(ghostAnimState)) {
    return innerControls;
  }
  if (isStartled) {
    return "startled";
  }
  if (isSleeping) {
    return "sleeping";
  }
  return ghostAnimState;
}

const passiveVariants: Variants = {
  idle: {
    y: [0, -12, -4, -10, 0],
    rotate: [0, -2, 2, -1, 0],
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    x: 0,
    opacity: 1,
    transition: {
      y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      scale: { duration: 0.2 },
      scaleX: { duration: 0.2 },
      scaleY: { duration: 0.2 },
      x: { duration: 0.2 },
      opacity: { duration: 0.2 },
    },
  },
  sleeping: {
    scale: 0.9,
    y: [0, 5, 0],
    opacity: 0.8,
    rotate: 0,
    x: 0,
    transition: { repeat: Infinity, duration: 3, ease: "easeInOut" },
  },
  startled: {
    scale: [1, 1.4, 0.8, 1.1, 1],
    y: [0, -60, 10, -5, 0],
    rotate: [0, -20, 20, -10, 10, 0],
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
  starving_idle: {
    y: 0,
    scale: [1, 0.94, 1, 0.96, 1],
    scaleX: 1,
    scaleY: 1,
    rotate: [-2, 2, -2, 2, 0],
    x: [-4, 4, -4, 4, 0],
    opacity: [1, 0.55, 1, 0.6, 1],
    transition: {
      duration: 0.55,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  tired_idle: {
    y: [0, -2, 0],
    scale: [1, 0.98, 1],
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    x: 0,
    opacity: [0.85, 0.65, 0.85],
    transition: {
      duration: 3.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  sleepy_idle: {
    y: [0, 1, 0, 2, 0],
    rotate: [0, 3, 0, 3, 0],
    scale: [1, 0.98, 1, 0.98, 1],
    scaleX: 1,
    scaleY: 1,
    x: 0,
    opacity: [0.95, 0.88, 0.95],
    transition: {
      duration: 2.8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  eating: {
    y: [0, -4, 0],
    x: 0,
    rotate: [0, -8, 8, -4, 0],
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    scale: [1, 1.18, 0.92, 1.12, 1],
    transition: { duration: 0.75, ease: [0.34, 1.4, 0.64, 1] },
  },
  angry: {
    y: 0,
    rotate: 0,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.45, ease: "easeInOut" },
  },
};

export type PetAssistantProps = {
  mode?: "home" | "floating";
  homeLayout?: "center" | "dock";
  className?: string;
  isThinking?: boolean;
  environment?: BrisbaneEnvironment | null;
  desktopOrbMode?: boolean;
  desktopPanelMode?: boolean;
  onOrbActivate?: () => void;
};

export default function PetAssistant({
  mode = "floating",
  homeLayout = "center",
  className,
  isThinking = false,
  environment: environmentProp,
  desktopOrbMode = false,
  desktopPanelMode = false,
  onOrbActivate,
}: PetAssistantProps) {
  const { pet, feedPet, hydrated, addMemoryLog, wakePet, scavengerPending, claimCyberScavengerReward } = usePet();
  const username = useUsername();
  const { isTauri } = useIsTauri();
  const petRef = useRef(pet);
  petRef.current = pet;
  const usernameRef = useRef(username);
  usernameRef.current = username;

  const constraintsRef = useRef<HTMLDivElement>(null);
  const ghostButtonRef = useRef<HTMLButtonElement>(null);
  const dragMovedRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const tauriWindowDragStartedRef = useRef(false);
  const spontaneousPendingRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const dropTimerRef = useRef<number | null>(null);
  const firstFoodTimerRef = useRef<number | null>(null);
  const prevHungerRef = useRef(pet.hunger);
  const prevEnergyRef = useRef(pet.energy);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const trickResetTimerRef = useRef<number | null>(null);
  const ghostAnimStateRef = useRef<GhostAnimState>("idle");
  const trickLockedRef = useRef(false);
  const rememberedToolCallsRef = useRef<Set<string>>(new Set());
  const foodLabelByIdRef = useRef<Map<string, string>>(new Map());
  const electricFlashTimerRef = useRef<number | null>(null);
  const startledTimerRef = useRef<number | null>(null);
  const innerControls = useAnimationControls();
  const homeDragConstraintsRef = useRef<HTMLDivElement>(null);
  const homeDragControls = useAnimationControls();
  const scavengerOuterControls = useAnimationControls();

  const isHome = mode === "home";

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [idleBubble, setIdleBubble] = useState<string | null>(null);
  const [eatBubble, setEatBubble] = useState<string | null>(null);
  const [trickBubble, setTrickBubble] = useState<string | null>(null);
  const [isStartled, setIsStartled] = useState(false);

  const [ghostAnimState, setGhostAnimState] = useState<GhostAnimState>("idle");
  const [activeFoods, setActiveFoods] = useState<ActiveFood[]>([]);
  const [trickLocked, setTrickLocked] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [activeEgg, setActiveEgg] = useState<EasterEggKind | null>(null);
  const [electricFlash, setElectricFlash] = useState<"yellow" | "cyan">(
    "yellow"
  );
  const [resolvedEnvironment, setResolvedEnvironment] =
    useState<BrisbaneEnvironment | null>(environmentProp ?? null);

  const startScavengerLock = useCallback(() => {
    setTrickLocked(true);
  }, []);

  const finishScavengerReward = useCallback(() => {
    claimCyberScavengerReward();
    setTrickLocked(false);
  }, [claimCyberScavengerReward]);

  const {
    scavengerActive,
    scavengerBubble,
    couponFlight,
  } = useCyberScavenging({
    enabled: hydrated && scavengerPending && mounted,
    displayName: username ?? "Yuxin",
    innerControls,
    outerControls: isHome ? homeDragControls : scavengerOuterControls,
    ghostButtonRef,
    onStart: startScavengerLock,
    onComplete: finishScavengerReward,
  });

  const theme = getAvatarTheme(pet.avatar);
  const activeEnvironment =
    environmentProp === undefined ? resolvedEnvironment : environmentProp;
  const environmentLabels = activeEnvironment
    ? formatEnvironmentLabel(activeEnvironment)
    : null;
  const isSleepyByEnvironment = Boolean(activeEnvironment?.isSleepy);
  const isRaining = activeEnvironment?.weather === "raining";
  const equippedTrophy = pet.equippedItem
    ? getTrophyByName(pet.equippedItem)
    : null;
  const equippedEmoji = equippedTrophy?.emoji;
  const rainOverlayEmoji = isRaining
    ? pet.equippedItem === "雨衣"
      ? "🧥"
      : "☂️"
    : null;
  const thinkingBubble = isThinking ? "正在大街小巷到处闻... 嗅嗅..." : null;
  const activeEnvironmentRef = useRef<BrisbaneEnvironment | null>(
    activeEnvironment
  );
  const environmentLabelsRef = useRef(environmentLabels);
  activeEnvironmentRef.current = activeEnvironment;
  environmentLabelsRef.current = environmentLabels;

  ghostAnimStateRef.current = ghostAnimState;
  trickLockedRef.current = trickLocked;

  const transport = useMemo(
    () =>
      new PetChatTransport(() => ({
        hunger: petRef.current.hunger,
        energy: petRef.current.energy,
        displayName: usernameRef.current ?? "Yuxin",
      })),
    []
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  const isLoading = status === "submitted" || status === "streaming";
  const isSleeping = pet.energy < 20;
  const isStriking = pet.hunger < 20;
  const isTired = pet.energy < 30 && !isStriking;
  const trickActive = !isPassiveAnimState(ghostAnimState) || trickLocked;
  const visibleMessages = useMemo(
    () => messages.filter((message) => !isSystemTriggerMessage(message)),
    [messages]
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearElectricFlash = useCallback(() => {
    if (electricFlashTimerRef.current) {
      window.clearInterval(electricFlashTimerRef.current);
      electricFlashTimerRef.current = null;
    }
  }, []);

  const resetInnerTransform = useCallback(() => {
    innerControls.set({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
    });
  }, [innerControls]);

  const resumePassiveAnim = useCallback(() => {
    const next = resolveIdleVariant(
      petRef.current.hunger,
      petRef.current.energy,
      isSleepyByEnvironment
    );
    setGhostAnimState(next);
    resetInnerTransform();
    void innerControls.start(next);
  }, [innerControls, isSleepyByEnvironment, resetInnerTransform]);

  const resetTrick = useCallback(() => {
    if (trickResetTimerRef.current) {
      window.clearTimeout(trickResetTimerRef.current);
      trickResetTimerRef.current = null;
    }
    clearElectricFlash();
    setActiveEgg(null);
    setTrickBubble(null);
    setTrickLocked(false);
    resumePassiveAnim();
  }, [clearElectricFlash, resumePassiveAnim]);

  const scheduleTrickReset = useCallback(
    (durationMs: number) => {
      if (trickResetTimerRef.current) {
        window.clearTimeout(trickResetTimerRef.current);
      }
      trickResetTimerRef.current = window.setTimeout(() => {
        resetTrick();
      }, durationMs);
    },
    [resetTrick]
  );

  const triggerAngry = useCallback(() => {
    setGhostAnimState("angry");
    void innerControls.start("angry").then(() => {
      if (ghostAnimStateRef.current === "angry") {
        resumePassiveAnim();
      }
    });
  }, [innerControls, resumePassiveAnim]);

  const triggerEating = useCallback(
    (foodLabel: string) => {
      const reaction =
        EATING_REACTIONS[Math.floor(Math.random() * EATING_REACTIONS.length)];
      setEatBubble(reaction);
      window.setTimeout(() => setEatBubble(null), 3000);

      if (petRef.current.energy < 20) {
        wakePet();
      }

      setGhostAnimState("eating");
      feedPet(foodLabel, 15, 10);
      void innerControls.start("eating").then(() => {
        if (ghostAnimStateRef.current === "eating") {
          resumePassiveAnim();
        }
      });
    },
    [feedPet, innerControls, resumePassiveAnim, wakePet]
  );

  const runElectricEgg = useCallback(() => {
    clearElectricFlash();
    setElectricFlash("yellow");
    electricFlashTimerRef.current = window.setInterval(() => {
      setElectricFlash((prev) => (prev === "yellow" ? "cyan" : "yellow"));
    }, 120);

    void innerControls.start({
      x: [-5, 5, -5, 5, 0],
      transition: { duration: 0.2, repeat: 10, ease: "linear" },
    });
  }, [clearElectricFlash, innerControls]);

  const runJellyEgg = useCallback(() => {
    void innerControls.start({
      scaleY: [1, 0.5, 1.2, 1],
      y: [0, -50, 0],
      transition: { duration: 1.1, ease: [0.34, 1.56, 0.64, 1] },
    });
  }, [innerControls]);

  const runStealthEgg = useCallback(() => {
    void innerControls.start({
      opacity: 0.1,
      transition: { duration: 0.35, ease: "easeOut" },
    });
  }, [innerControls]);

  const runPumpingEgg = useCallback(() => {
    void innerControls.start({
      scaleX: 2.5,
      scaleY: 0.82,
      transition: { duration: 2.8, ease: [0.45, 0, 0.2, 1] },
    });
  }, [innerControls]);

  const runLoveEgg = useCallback(() => {
    void innerControls.start({
      scale: [1, 1.14, 1, 1.1, 1],
      transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
    });
  }, [innerControls]);

  const runSpinEgg = useCallback(() => {
    void innerControls.start({
      rotate: 1440,
      transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] },
    });
  }, [innerControls]);

  const runEasterEgg = useCallback(
    (egg: EasterEgg) => {
      const durationMs =
        egg.kind === "stealth" ? 4_000 : randomEggDurationMs();

      setTrickLocked(true);
      setActiveEgg(egg.kind);
      setTrickBubble(egg.bubble);

      switch (egg.kind) {
        case "electric":
          runElectricEgg();
          break;
        case "jelly":
          runJellyEgg();
          break;
        case "stealth":
          runStealthEgg();
          break;
        case "pumping":
          runPumpingEgg();
          break;
        case "love":
          runLoveEgg();
          break;
        case "spin":
          runSpinEgg();
          break;
      }

      scheduleTrickReset(durationMs);
    },
    [
      runElectricEgg,
      runJellyEgg,
      runLoveEgg,
      runPumpingEgg,
      runSpinEgg,
      runStealthEgg,
      scheduleTrickReset,
    ]
  );

  const triggerRandomEasterEgg = useCallback(() => {
    if (trickLockedRef.current || isSleeping) {
      return;
    }

    const egg = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
    runEasterEgg(egg);
  }, [isSleeping, runEasterEgg]);

  const forceWake = useCallback(() => {
    wakePet();
    const who = username ?? "你";
    setTrickBubble(`哎呀！${who} 我醒了！👀`);
    window.setTimeout(() => setTrickBubble(null), 3000);
    setGhostAnimState("idle");

    if (startledTimerRef.current) {
      window.clearTimeout(startledTimerRef.current);
    }

    setIsStartled(true);
    startledTimerRef.current = window.setTimeout(() => {
      setIsStartled(false);
      startledTimerRef.current = null;
    }, 800);
  }, [wakePet, username]);

  const handlePetDoubleClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      forceWake();
    },
    [forceWake]
  );

  const spawnFood = useCallback((options?: { preferCandy?: boolean }) => {
    if (typeof window === "undefined") {
      return;
    }

    const hunger = petRef.current.hunger;
    if (hunger >= 70) {
      return;
    }

    const emoji = pickFoodEmoji(hunger, options?.preferCandy);
    const id = crypto.randomUUID();
    foodLabelByIdRef.current.set(id, FOOD_LABELS[emoji]);
    const cap = maxFoodOnScreen(hunger);

    setActiveFoods((prev) => {
      if (prev.length >= cap) {
        return prev;
      }

      return [
        ...prev,
        {
          id,
          emoji,
          x: randomDropX(),
          landY: randomLandY(),
          phase: "falling",
        },
      ];
    });
  }, []);

  const spawnFoodBurst = useCallback(
    (count: number, preferCandy = true) => {
      for (let index = 0; index < count; index += 1) {
        window.setTimeout(() => {
          spawnFood({ preferCandy });
        }, index * 320);
      }
    },
    [spawnFood]
  );

  const scheduleFoodDrop = useCallback(() => {
    if (dropTimerRef.current) {
      window.clearTimeout(dropTimerRef.current);
    }

    const hunger = petRef.current.hunger;

    dropTimerRef.current = window.setTimeout(() => {
      const currentHunger = petRef.current.hunger;

      if (currentHunger >= 70) {
        scheduleFoodDrop();
        return;
      }

      if (currentHunger < 20) {
        spawnFood({ preferCandy: true });
        if (Math.random() < 0.45) {
          window.setTimeout(() => spawnFood({ preferCandy: true }), 180);
        }
      } else {
        spawnFood();
      }

      scheduleFoodDrop();
    }, getDropDelayMs(petRef.current.dropFrequency, hunger));
  }, [spawnFood]);

  const handleFoodClick = useCallback((foodId: string) => {
    const rect = ghostButtonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    setActiveFoods((prev) =>
      prev.map((food) =>
        food.id === foodId && food.phase === "landed"
          ? {
              ...food,
              phase: "flying",
              targetX,
              targetY,
            }
          : food
      )
    );
  }, []);

  const handleFoodReachGhost = useCallback(
    (foodId: string) => {
      const foodLabel = foodLabelByIdRef.current.get(foodId) ?? "🍪饼干";
      foodLabelByIdRef.current.delete(foodId);
      setActiveFoods((prev) => prev.filter((food) => food.id !== foodId));
      triggerEating(foodLabel);
    },
    [triggerEating]
  );

  const handleFoodLanded = useCallback((foodId: string) => {
    setActiveFoods((prev) =>
      prev.map((food) =>
        food.id === foodId ? { ...food, phase: "landed" } : food
      )
    );
  }, []);

  const scheduleIdleSpeech = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = window.setTimeout(() => {
      if (petRef.current.energy < 10) {
        scheduleIdleSpeech();
        return;
      }

      const trigger = buildIdleSpeechTrigger(
        petRef.current.hunger,
        petRef.current.energy,
        petRef.current.personality
      );
      spontaneousPendingRef.current = true;
      void sendMessageRef.current({ text: trigger });
      scheduleIdleSpeech();
    }, randomIdleDelayMs());
  }, []);

  const handlePetPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (trickLockedRef.current || isSleeping) {
        return;
      }

      if (isTauri && event.button === 0) {
        pointerStartRef.current = { x: event.clientX, y: event.clientY };
        tauriWindowDragStartedRef.current = false;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      longPressFiredRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        triggerRandomEasterEgg();
      }, LONG_PRESS_MS);
    },
    [clearLongPressTimer, isSleeping, isTauri, triggerRandomEasterEgg]
  );

  const handlePetPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!isTauri || !desktopOrbMode || event.button !== 0) {
        return;
      }

      const start = pointerStartRef.current;
      if (!start || tauriWindowDragStartedRef.current) {
        return;
      }

      const moved =
        Math.abs(event.clientX - start.x) > 6 ||
        Math.abs(event.clientY - start.y) > 6;

      if (moved) {
        tauriWindowDragStartedRef.current = true;
        void startTauriWindowDrag();
      }
    },
    [desktopOrbMode, isTauri]
  );

  const handlePetPointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      clearLongPressTimer();

      if (isHome && desktopOrbMode) {
        const start = pointerStartRef.current;
        pointerStartRef.current = null;
        const moved =
          tauriWindowDragStartedRef.current ||
          (start &&
            (Math.abs(event.clientX - start.x) > 8 ||
              Math.abs(event.clientY - start.y) > 8));
        tauriWindowDragStartedRef.current = false;

        if (
          !longPressFiredRef.current &&
          !moved &&
          !trickLockedRef.current &&
          onOrbActivate
        ) {
          onOrbActivate();
        }
        return;
      }

      pointerStartRef.current = null;
      tauriWindowDragStartedRef.current = false;

      if (isHome) {
        return;
      }

      if (
        !longPressFiredRef.current &&
        !dragMovedRef.current &&
        !trickLockedRef.current
      ) {
        setIsOpen((open) => !open);
      }
    },
    [clearLongPressTimer, desktopOrbMode, isHome, onOrbActivate]
  );

  const handlePetPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      clearLongPressTimer();
      longPressFiredRef.current = false;
    },
    [clearLongPressTimer]
  );

  useEffect(() => {
    setMounted(true);
    try {
      const seen = localStorage.getItem("lhw-ghost-hint-seen");
      if (!seen) {
        setHintVisible(true);
        localStorage.setItem("lhw-ghost-hint-seen", "1");
        const t = window.setTimeout(() => setHintVisible(false), 8000);
        return () => {
          window.clearTimeout(t);
          if (startledTimerRef.current) {
            window.clearTimeout(startledTimerRef.current);
          }
        };
      }
    } catch {
      // ignore
    }
    return () => {
      if (startledTimerRef.current) {
        window.clearTimeout(startledTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (environmentProp !== undefined) {
      setResolvedEnvironment(environmentProp);
      return;
    }

    let cancelled = false;
    void getBrisbaneEnvironment().then((env) => {
      if (!cancelled) {
        setResolvedEnvironment(env);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [environmentProp]);

  useEffect(() => {
    if (!mounted || !hydrated) {
      return;
    }

    if (desktopOrbMode) {
      setActiveFoods([]);
      return () => {
        if (idleTimerRef.current) {
          window.clearTimeout(idleTimerRef.current);
        }
        if (dropTimerRef.current) {
          window.clearTimeout(dropTimerRef.current);
        }
        if (firstFoodTimerRef.current) {
          window.clearTimeout(firstFoodTimerRef.current);
        }
      };
    }

    if (!isHome) {
      scheduleIdleSpeech();
    }

    const hunger = petRef.current.hunger;
    const firstDelay = Math.min(5000, petRef.current.dropFrequency * 1000);

    if (hunger < 20) {
      spawnFoodBurst(8, true);
    } else if (hunger < 40) {
      firstFoodTimerRef.current = window.setTimeout(() => {
        spawnFood({ preferCandy: true });
        scheduleFoodDrop();
      }, Math.min(2500, firstDelay));
    } else if (hunger < 70) {
      firstFoodTimerRef.current = window.setTimeout(() => {
        spawnFood();
        scheduleFoodDrop();
      }, firstDelay);
    } else {
      scheduleFoodDrop();
    }

    if (petRef.current.energy < 20) {
      spawnFoodBurst(6, true);
    }

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      if (dropTimerRef.current) {
        window.clearTimeout(dropTimerRef.current);
      }
      if (firstFoodTimerRef.current) {
        window.clearTimeout(firstFoodTimerRef.current);
      }
      if (trickResetTimerRef.current) {
        window.clearTimeout(trickResetTimerRef.current);
      }
      clearElectricFlash();
    };
  }, [
    mounted,
    hydrated,
    desktopOrbMode,
    isHome,
    scheduleFoodDrop,
    scheduleIdleSpeech,
    spawnFood,
    spawnFoodBurst,
    clearElectricFlash,
  ]);

  useEffect(() => {
    if (desktopOrbMode) {
      return;
    }
    const prevHunger = prevHungerRef.current;
    prevHungerRef.current = pet.hunger;
    if (pet.hunger < 20 && prevHunger >= 20) {
      spawnFoodBurst(8, true);
    }
  }, [desktopOrbMode, pet.hunger, spawnFoodBurst]);

  useEffect(() => {
    if (desktopOrbMode) {
      return;
    }
    const prevEnergy = prevEnergyRef.current;
    prevEnergyRef.current = pet.energy;
    if (pet.energy < 20 && prevEnergy >= 20) {
      spawnFoodBurst(6, true);
    }
  }, [desktopOrbMode, pet.energy, spawnFoodBurst]);

  useEffect(() => {
    if (!spontaneousPendingRef.current || isLoading) {
      return;
    }

    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (!lastAssistant) {
      return;
    }

    const text = getMessageCopyText(lastAssistant.parts);
    if (!text) {
      return;
    }

    spontaneousPendingRef.current = false;
    setIdleBubble(text);
    const timer = window.setTimeout(() => setIdleBubble(null), 5000);

    return () => window.clearTimeout(timer);
  }, [messages, isLoading]);

  useEffect(() => {
    const assistantMessages = messages.filter((message) => message.role === "assistant");
    for (const message of assistantMessages) {
      for (const part of message.parts) {
        if (part.type !== "tool-remember_preference") {
          continue;
        }
        if (part.state !== "output-available") {
          continue;
        }
        if (rememberedToolCallsRef.current.has(part.toolCallId)) {
          continue;
        }

        const output =
          typeof part.output === "object" && part.output !== null
            ? (part.output as { content?: string; savedAt?: string })
            : null;
        const input =
          typeof part.input === "object" && part.input !== null
            ? (part.input as { content?: string })
            : null;
        const content = output?.content ?? input?.content ?? "";
        const savedAt = output?.savedAt;

        if (content.trim()) {
          addMemoryLog(content, savedAt);
          rememberedToolCallsRef.current.add(part.toolCallId);
        }
      }
    }
  }, [addMemoryLog, messages]);

  useEffect(() => {
    if (!isThinking || trickLockedRef.current) {
      return;
    }

    setGhostAnimState("idle");
    void innerControls.start({
      x: [0, -3, 3, -2, 2, 0],
      rotate: [0, -6, 6, -5, 5, 0],
      transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
    });
  }, [innerControls, isThinking]);

  useEffect(() => {
    if (isThinking) {
      return;
    }
    if (
      !isPassiveAnimState(ghostAnimStateRef.current) ||
      trickLockedRef.current
    ) {
      return;
    }
    const next = resolveIdleVariant(
      pet.hunger,
      pet.energy,
      isSleepyByEnvironment
    );
    setGhostAnimState(next);
    void innerControls.start(next);
  }, [
    pet.hunger,
    pet.energy,
    isSleepyByEnvironment,
    isThinking,
    innerControls,
  ]);

  useEffect(() => {
    if (!mounted || !hydrated) return;
    if (dropTimerRef.current) window.clearTimeout(dropTimerRef.current);
    scheduleFoodDrop();
  }, [pet.dropFrequency, pet.hunger, mounted, hydrated, scheduleFoodDrop]);

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }

    const text = error.message;
    if (text.includes("NEXT_PUBLIC_GROQ_API_KEY")) {
      return "Groq API Key 未配置。请在 .env.local 添加 NEXT_PUBLIC_GROQ_API_KEY。";
    }
    if (/rate limit|429|quota/i.test(text)) {
      return text.includes("Groq") ? text : "Groq API 请求过快，请稍后再试。";
    }
    if (/invalid.*api.*key|401|403|unauthorized/i.test(text)) {
      return "Groq API Key 无效。请到 console.groq.com 检查。";
    }

    return text || "小幽灵连接失败，请稍后再试。";
  }, [error]);

  const bubbleText =
    scavengerBubble ?? eatBubble ?? trickBubble ?? thinkingBubble ?? idleBubble;
  const isScavengerBubble = Boolean(scavengerBubble);

  if (!mounted && !desktopOrbMode) {
    return null;
  }

  const petSize = isHome ? "h-28 w-28" : "h-16 w-16";
  const iconSize = isHome ? "h-12 w-12" : "h-8 w-8";

  const eggButtonClass =
    activeEgg === "electric"
      ? electricFlash === "yellow"
        ? "border-yellow-300/70 bg-yellow-400 shadow-yellow-500/50 ring-yellow-400/40"
        : "border-cyan-300/70 bg-cyan-400 shadow-cyan-500/50 ring-cyan-400/40"
      : activeEgg === "love"
        ? "border-pink-300/60 bg-pink-500 shadow-pink-500/50 ring-pink-400/40"
        : activeEgg === "pumping"
          ? "border-orange-300/50 bg-orange-600 shadow-orange-900/50 ring-orange-500/30"
          : "";

  const petButton = (
    <button
      ref={ghostButtonRef}
      type="button"
      onPointerDown={handlePetPointerDown}
      onPointerMove={handlePetPointerMove}
      onPointerUp={handlePetPointerUp}
      onPointerCancel={handlePetPointerCancel}
      onDoubleClick={handlePetDoubleClick}
      className={`relative flex ${petSize} touch-none items-center justify-center rounded-full border-2 text-white shadow-xl ring-4 transition hover:scale-105 active:scale-95 ${
        isSleeping
          ? "border-zinc-400/40 bg-zinc-600 shadow-zinc-900/40 ring-zinc-500/20"
          : isStriking
            ? "border-red-400/50 bg-zinc-700 shadow-red-950/50 ring-red-500/20"
            : isTired
              ? "border-sky-400/40 bg-sky-900/70 shadow-sky-950/40 ring-sky-500/20"
              : pet.hunger < 40
                ? "border-amber-300/50 bg-amber-600 shadow-amber-900/40 ring-amber-500/25 hover:bg-amber-500"
                : trickActive
                  ? eggButtonClass ||
                    "border-fuchsia-300/50 bg-fuchsia-600 shadow-fuchsia-900/40 ring-fuchsia-500/25"
                  : `${theme.border} ${theme.bg} ${theme.shadow} ${theme.ring}`
      }`}
      style={{
        filter: isStriking
          ? "grayscale(0.5) sepia(0.35) brightness(0.82) hue-rotate(-28deg)"
          : isTired
            ? "brightness(0.78) saturate(0.65)"
            : pet.hunger < 40
              ? "saturate(1.2) hue-rotate(-12deg)"
              : undefined,
      }}
      aria-label={isHome ? "电子宠物" : isOpen ? "关闭宠物" : "打开宠物"}
    >
      {!isSleeping && isPassiveAnimState(ghostAnimState) && !isStriking && (
        <span className={`absolute inset-0 animate-ping rounded-full ${theme.ping}`} />
      )}
      {isStriking && (
        <span className="absolute inset-0 animate-pulse rounded-full bg-red-500/25" />
      )}
      {isStriking && !isHome && (
        <span className="pointer-events-none absolute -bottom-7 left-1/2 w-max -translate-x-1/2 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-medium text-white shadow-lg">
          快喂屏幕上的糖果！
        </span>
      )}
      {isSleeping ? (
        <>
          <span className="relative text-lg font-semibold">Zzz</span>
          {!isHome && (
            <span className="pointer-events-none absolute -bottom-7 left-1/2 w-max -translate-x-1/2 rounded-full bg-zinc-900/85 px-2 py-0.5 text-[10px] font-medium text-zinc-200 shadow-lg">
              点 🍬 糖果唤醒
            </span>
          )}
        </>
      ) : pet.avatar === "puppy" ? (
        <Dog
          className={`relative ${iconSize} ${
            activeEgg === "love" ? "text-pink-200" : ""
          }`}
        />
      ) : (
        <Ghost
          className={`relative ${iconSize} ${
            activeEgg === "love" ? "text-pink-500" : ""
          }`}
        />
      )}
      {pet.hunger < 40 && !isSleeping && (
        <span
          className={`absolute -right-0.5 -top-0.5 rounded-full px-1.5 text-[10px] font-bold ${
            isStriking ? "bg-red-500 text-white" : "bg-amber-400 text-amber-950"
          }`}
        >
          {isStriking ? "罢工" : "饿"}
        </span>
      )}
      {rainOverlayEmoji && (
        <span className="absolute -left-1 -top-2 text-base">{rainOverlayEmoji}</span>
      )}
      {equippedEmoji && (
        <span className="absolute -right-1 -bottom-2 text-base">
          {equippedEmoji}
        </span>
      )}
      <span
        className={`absolute -left-1 -bottom-1 rounded-full bg-zinc-950/90 px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-white/15 ${theme.badge}`}
      >
        Lv.{pet.loginDays}
      </span>
    </button>
  );

  const bubbleNode = (
    <AnimatePresence>
      {bubbleText && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.95 }}
          className={`pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-50 w-[min(calc(100vw-2rem),20rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 text-center text-[13px] leading-snug shadow-2xl backdrop-blur-xl ${
            isScavengerBubble
              ? "border-amber-300/80 bg-gradient-to-br from-amber-500/95 via-orange-500/95 to-amber-600/95 font-semibold text-amber-50 shadow-amber-500/40 ring-2 ring-amber-200/50"
              : `bg-zinc-950/95 shadow-black/30 ${theme.bubble}`
          }`}
        >
          {bubbleText}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const petAnimate = resolvePetAnimate(
    trickLocked,
    innerControls,
    isStartled,
    isSleeping,
    ghostAnimState
  );

  const enableFramerPetDrag = desktopPanelMode
    ? !isSleeping
    : !isTauri &&
      !desktopOrbMode &&
      isPassiveAnimState(ghostAnimState) &&
      !isSleeping &&
      !trickLocked &&
      !scavengerActive;

  const panelDragTransition = {
    power: 0.45,
    timeConstant: 195,
    bounceStiffness: 300,
    bounceDamping: 15,
  };

  const defaultDragTransition = {
    power: 0.28,
    timeConstant: 220,
    bounceStiffness: 360,
    bounceDamping: 18,
  };

  const animatedPet = (
    <motion.div
      animate={petAnimate}
      variants={passiveVariants}
      initial="idle"
      whileHover={
        !trickLocked && isPassiveAnimState(ghostAnimState) && !isSleeping
          ? { scale: 1.06, y: -2 }
          : undefined
      }
      whileTap={
        !trickLocked && !isSleeping ? { scale: 0.9, rotate: -4 } : undefined
      }
      transition={
        typeof petAnimate === "string"
          ? { type: "tween" }
          : { type: "spring", stiffness: 420, damping: 18 }
      }
      className={`relative ${isTauri ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {petButton}
    </motion.div>
  );

  const foodLayer = activeFoods.map((food) => (
    <motion.button
      key={food.id}
      type="button"
      aria-label="拾取食物"
      disabled={food.phase === "falling"}
      onClick={() => handleFoodClick(food.id)}
      className="pointer-events-auto fixed z-[2147483645] flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-zinc-900/80 text-2xl shadow-lg shadow-black/40 backdrop-blur-sm transition hover:scale-110 disabled:pointer-events-none"
      initial={{ left: food.x, top: -50 }}
      animate={
        food.phase === "flying" && food.targetX != null && food.targetY != null
          ? {
              left: food.targetX,
              top: food.targetY,
              scale: [1, 1.2, 0.2],
              opacity: [1, 1, 0],
            }
          : { left: food.x, top: food.landY, scale: 1, opacity: 1 }
      }
      transition={
        food.phase === "flying"
          ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
          : {
              type: "spring",
              stiffness: 140,
              damping: 12,
              mass: 0.75,
              velocity: 2,
            }
      }
      onAnimationComplete={() => {
        if (food.phase === "falling") handleFoodLanded(food.id);
        if (food.phase === "flying") handleFoodReachGhost(food.id);
      }}
    >
      {food.emoji}
    </motion.button>
  ));

  if (isHome) {
    const petSizeHome = desktopOrbMode
      ? "h-28 w-28"
      : desktopPanelMode
        ? "h-16 w-16"
        : homeLayout === "dock"
          ? "h-16 w-16"
          : "h-28 w-28";
    const iconSizeHome = desktopOrbMode
      ? "h-[4.5rem] w-[4.5rem]"
      : desktopPanelMode
        ? "h-7 w-7"
        : homeLayout === "dock"
          ? "h-8 w-8"
          : "h-12 w-12";
    const orbGhostClass =
      pet.avatar === "puppy"
        ? "fill-amber-200 text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.85)]"
        : "fill-violet-100 text-violet-400 drop-shadow-[0_0_20px_rgba(167,139,250,0.9)]";

    return (
      <>
        {!desktopOrbMode &&
          createPortal(
            <>
              {foodLayer}
              <ScavengerCouponDrop flight={couponFlight} />
            </>,
            document.body
          )}
        <div
          ref={homeDragConstraintsRef}
          className={
            desktopOrbMode
              ? `pointer-events-none relative mx-auto ${className ?? ""}`
              : desktopPanelMode
                ? `pointer-events-none absolute inset-0 z-[25] flex items-center justify-center ${className ?? ""}`
                : homeLayout === "center"
                  ? `relative flex h-full w-full items-center justify-center ${className ?? ""}`
                  : homeLayout === "dock"
                    ? "pointer-events-none fixed inset-0 z-[25]"
                    : `relative mx-auto ${className ?? ""}`
          }
        >
          <motion.div
            drag={enableFramerPetDrag}
            dragMomentum
            dragTransition={
              desktopPanelMode ? panelDragTransition : defaultDragTransition
            }
            dragElastic={desktopPanelMode ? 0.28 : 0.12}
            dragConstraints={
              homeLayout === "dock" || desktopPanelMode
                ? homeDragConstraintsRef
                : undefined
            }
            whileDrag={
              desktopOrbMode || !enableFramerPetDrag
                ? undefined
                : desktopPanelMode
                  ? { scale: 1.08, rotate: 6, zIndex: 60, cursor: "grabbing" }
                  : { scale: 1.12, rotate: 8, cursor: "grabbing" }
            }
            animate={homeDragControls}
            onDragStart={() => {
              dragMovedRef.current = true;
              clearLongPressTimer();
            }}
            onDragEnd={() => {
              window.setTimeout(() => {
                dragMovedRef.current = false;
              }, 80);
              if (homeLayout === "dock" && !desktopPanelMode) {
                void homeDragControls.start({
                  x: 0,
                  y: 0,
                  transition: {
                    type: "spring",
                    stiffness: 420,
                    damping: 28,
                  },
                });
              }
            }}
            className={`relative ${desktopPanelMode ? "pointer-events-auto tauri-no-drag cursor-grab active:cursor-grabbing" : homeLayout === "dock" ? "pointer-events-auto shrink-0" : className ?? ""} ${isTauri && !desktopOrbMode && !desktopPanelMode ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            {!desktopOrbMode && (
              <div className="relative z-50">{bubbleNode}</div>
            )}
            <motion.div
              animate={petAnimate}
              variants={passiveVariants}
              initial="idle"
              whileHover={
                desktopOrbMode || trickLocked || !isPassiveAnimState(ghostAnimState) || isSleeping
                  ? undefined
                  : { scale: 1.05, y: -2 }
              }
              whileTap={
                desktopOrbMode || trickLocked || isSleeping
                  ? undefined
                  : { scale: 0.92, rotate: -3 }
              }
              transition={
                typeof petAnimate === "string"
                  ? { type: "tween" }
                  : { type: "spring", stiffness: 420, damping: 18 }
              }
              className="relative"
            >
              <button
                ref={ghostButtonRef}
                type="button"
                tabIndex={desktopOrbMode ? -1 : 0}
                onPointerDown={desktopOrbMode ? undefined : handlePetPointerDown}
                onPointerMove={desktopOrbMode ? undefined : handlePetPointerMove}
                onPointerUp={desktopOrbMode ? undefined : handlePetPointerUp}
                onPointerCancel={desktopOrbMode ? undefined : handlePetPointerCancel}
                onDoubleClick={desktopOrbMode ? undefined : handlePetDoubleClick}
                className={
                  desktopOrbMode
                    ? `relative flex ${petSizeHome} items-center justify-center bg-transparent shadow-none ring-0`
                    : `${isTauri && desktopOrbMode ? "tauri-no-drag " : ""}relative flex ${petSizeHome} touch-none items-center justify-center rounded-full border-2 text-white transition hover:scale-105 active:scale-95 ${
                        desktopPanelMode
                          ? "shadow-lg ring-2"
                          : "shadow-xl ring-4"
                      } ${
                        isSleeping
                          ? "border-zinc-400/40 bg-zinc-600 shadow-zinc-900/40 ring-zinc-500/20"
                          : isStriking
                            ? "border-red-400/50 bg-zinc-700 shadow-red-950/50 ring-red-500/20"
                            : trickActive
                              ? eggButtonClass ||
                                "border-fuchsia-300/50 bg-fuchsia-600 shadow-fuchsia-900/40 ring-fuchsia-500/25"
                              : `${theme.border} ${theme.bg} ${theme.shadow} ${theme.ring}`
                      }`
                }
                aria-label="电子宠物"
                aria-hidden={desktopOrbMode}
              >
                {!desktopOrbMode &&
                  !isSleeping &&
                  isPassiveAnimState(ghostAnimState) &&
                  !isStriking && (
                    <span
                      className={`absolute inset-0 animate-ping rounded-full ${theme.ping}`}
                    />
                  )}
                {!desktopOrbMode && rainOverlayEmoji && (
                  <span className="absolute -top-2 text-lg">{rainOverlayEmoji}</span>
                )}
                {!desktopOrbMode && equippedEmoji && !rainOverlayEmoji && (
                  <span className="absolute -top-2 text-lg">{equippedEmoji}</span>
                )}
                {isSleeping ? (
                  <span
                    className={`relative font-semibold ${desktopOrbMode ? "text-base text-violet-200/90" : "text-lg"}`}
                  >
                    Zzz
                  </span>
                ) : pet.avatar === "puppy" ? (
                  <Dog
                    className={`relative ${iconSizeHome} ${desktopOrbMode ? orbGhostClass : ""}`}
                    strokeWidth={desktopOrbMode ? 1.5 : 2}
                  />
                ) : (
                  <Ghost
                    className={`relative ${iconSizeHome} ${desktopOrbMode ? orbGhostClass : ""}`}
                    strokeWidth={desktopOrbMode ? 1.5 : 2}
                  />
                )}
                {!desktopOrbMode && (
                  <span
                    className={`absolute -left-1 -bottom-1 rounded-full bg-zinc-950/90 font-bold ring-1 ring-white/15 ${theme.badge} ${
                      desktopPanelMode
                        ? "px-1 py-px text-[8px]"
                        : "px-1.5 py-0.5 text-[9px]"
                    }`}
                  >
                    Lv.{pet.loginDays}
                  </span>
                )}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  return createPortal(
    <>
      {foodLayer}
      <ScavengerCouponDrop flight={couponFlight} />
      <div
        ref={constraintsRef}
        className="pointer-events-none fixed inset-0 z-[2147483646]"
        aria-live="polite"
      >
        <motion.div
          drag={enableFramerPetDrag}
          dragMomentum={true}
          dragTransition={{
            power: 0.28,
            timeConstant: 220,
            bounceStiffness: 360,
            bounceDamping: 18,
          }}
          dragElastic={0.08}
          dragConstraints={constraintsRef}
          whileDrag={{ scale: 1.12, rotate: 8, cursor: "grabbing" }}
          animate={scavengerOuterControls}
          className={`pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] ${isTauri ? "cursor-grab active:cursor-grabbing" : ""}`}
          onDragStart={() => {
            dragMovedRef.current = true;
            clearLongPressTimer();
          }}
          onDragEnd={() => {
            window.setTimeout(() => {
              dragMovedRef.current = false;
            }, 80);
          }}
        >
          <AnimatePresence>
            {hintVisible && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 w-[min(calc(100vw-2rem),16rem)] rounded-2xl border border-amber-300/40 bg-amber-950/95 px-3 py-2 text-[12px] leading-snug text-amber-100 shadow-2xl"
              >
                电子宠物已上线！等天上掉落食物，点击喂我；长按 0.8 秒有彩蛋。
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-50">{bubbleNode}</div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-[calc(100%+0.75rem)] right-0 z-40 w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-2xl border border-violet-300/30 bg-zinc-950/95 shadow-2xl shadow-violet-950/50 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-violet-200">
                      Lv.{pet.loginDays} · {pet.personality}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      饥饿 {pet.hunger} · 精力 {pet.energy}
                    </p>
                    {environmentLabels && (
                      <p className="text-[11px] text-zinc-500">
                        {environmentLabels.timeOfDay} · {environmentLabels.weather}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="关闭"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto px-3 py-3">
                  {visibleMessages.length === 0 && !errorMessage && (
                    <p className="text-sm text-zinc-400">
                      {isSleeping
                        ? "Zzz… 我太困了，晚点再来找我～"
                        : isStriking
                          ? "罢工中！快去捡食物！😤"
                          : "哼，找我干嘛？问快点～"}
                    </p>
                  )}
                  {visibleMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-violet-600 text-white"
                            : "bg-white/10 text-zinc-100"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <AssistantMessageBubble
                            text={getMessageCopyText(message.parts)}
                          />
                        ) : (
                          <MessageParts parts={message.parts} />
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <p className="text-xs text-zinc-500">正在琢磨…</p>
                  )}
                  {errorMessage && (
                    <div className="rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                      {errorMessage}
                    </div>
                  )}
                </div>

                <form
                  className="flex items-center gap-2 border-t border-white/10 p-2.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const text = input.trim();
                    if (!text || isLoading || isSleeping) return;
                    clearError();
                    if (isStriking) triggerAngry();
                    sendMessage({ text });
                    setInput("");
                  }}
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder={isStriking ? "罢工中…" : "说点什么…"}
                    className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || isSleeping}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {animatedPet}
        </motion.div>
      </div>
    </>,
    document.body
  );
}
