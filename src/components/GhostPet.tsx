"use client";

import { usePet } from "@/components/PetProvider";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  type Variants,
} from "framer-motion";
import { Check, Copy, Ghost, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FOOD_EMOJIS = ["🍪", "🍬", "🍎"] as const;
const FOOD_LABELS: Record<(typeof FOOD_EMOJIS)[number], string> = {
  "🍪": "🍪饼干",
  "🍬": "🍬糖果",
  "🍎": "🍎苹果",
};
const LONG_PRESS_MS = 800;
const SHIFT_FORMS = [
  { key: "alien" as const, emoji: "👾", bubble: "我变异啦！" },
  { key: "robot" as const, emoji: "🤖", bubble: "系统重启中…哔哔！" },
  { key: "demon" as const, emoji: "👿", bubble: "嘿嘿…力量涌上来了！" },
];

type GhostIcon = "ghost" | "alien" | "robot" | "demon";
type GhostAnimState =
  | "idle"
  | "starving_idle"
  | "tired_idle"
  | "eating"
  | "flying"
  | "spinning"
  | "angry";
type TrickKind = "shift" | "fly" | "spin";

type ActiveFood = {
  id: string;
  emoji: (typeof FOOD_EMOJIS)[number];
  x: number;
  landY: number;
  phase: "falling" | "landed" | "flying";
  targetX?: number;
  targetY?: number;
};

type FlyKeyframes = {
  x: number[];
  y: number[];
};

function getMessageCopyText(parts: UIMessage["parts"]) {
  return parts
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

        return recipient ? `📨 已安排发送给 ${recipient}` : "";
      }

      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
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
              {part.text}
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

function randomDropDelayMs() {
  return 15_000 + Math.floor(Math.random() * 30_000);
}

function randomTrickDurationMs() {
  return 5_000 + Math.floor(Math.random() * 5_000);
}

function randomLandY() {
  const margin = 72;
  return window.innerHeight - margin - Math.random() * 48;
}

function randomDropX() {
  const margin = 40;
  return margin + Math.random() * (window.innerWidth - margin * 2);
}

function randomFlyPath(): FlyKeyframes {
  const count = 3 + Math.floor(Math.random() * 2);
  const x: number[] = [0];
  const y: number[] = [0];

  for (let i = 1; i < count; i++) {
    x.push((Math.random() - 0.5) * window.innerWidth * 0.55);
    y.push((Math.random() - 0.5) * window.innerHeight * 0.45);
  }

  x.push(0);
  y.push(0);

  return { x, y };
}

function resolveIdleVariant(hunger: number, energy: number): GhostAnimState {
  if (hunger < 20) {
    return "starving_idle";
  }
  if (energy < 20) {
    return "tired_idle";
  }
  return "idle";
}

function isPassiveAnimState(state: GhostAnimState) {
  return state === "idle" || state === "starving_idle" || state === "tired_idle";
}

const ghostVariants: Variants = {
  idle: {
    y: [0, -6, 0],
    scale: 1,
    rotate: 0,
    x: 0,
    opacity: 1,
    transition: {
      y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
      scale: { duration: 0.2 },
      rotate: { duration: 0.2 },
      x: { duration: 0.2 },
      opacity: { duration: 0.2 },
    },
  },
  starving_idle: {
    y: 0,
    scale: [1, 0.94, 1, 0.96, 1],
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
    rotate: 0,
    x: 0,
    opacity: [0.85, 0.65, 0.85],
    transition: {
      duration: 3.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  eating: {
    y: 0,
    x: 0,
    rotate: 0,
    opacity: 1,
    scale: [1, 1.22, 0.88, 1.14, 1],
    transition: { duration: 0.65, ease: "easeOut" },
  },
  angry: {
    y: 0,
    rotate: 0,
    scale: 1,
    opacity: 1,
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.45, ease: "easeInOut" },
  },
  flying: (custom: FlyKeyframes) => ({
    x: custom.x,
    y: custom.y,
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: 2.4,
      ease: "linear",
      times: custom.x.map((_, index) => index / (custom.x.length - 1)),
    },
  }),
  spinning: {
    y: 0,
    x: 0,
    scale: 1,
    opacity: 1,
    rotate: 1080,
    transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
  },
};

function resolveShiftEmoji(icon: GhostIcon) {
  if (icon === "alien") return "👾";
  if (icon === "robot") return "🤖";
  if (icon === "demon") return "👿";
  return null;
}

export default function GhostPet() {
  const { pet, feedPet, hydrated } = usePet();
  const petRef = useRef(pet);
  petRef.current = pet;

  const constraintsRef = useRef<HTMLDivElement>(null);
  const ghostWrapRef = useRef<HTMLDivElement>(null);
  const ghostButtonRef = useRef<HTMLButtonElement>(null);
  const dragMovedRef = useRef(false);
  const spontaneousPendingRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);
  const dropTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const trickResetTimerRef = useRef<number | null>(null);
  const ghostAnimStateRef = useRef<GhostAnimState>("idle");
  const trickLockedRef = useRef(false);
  const foodLabelByIdRef = useRef<Map<string, string>>(new Map());
  const ghostControls = useAnimationControls();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [idleBubble, setIdleBubble] = useState<string | null>(null);
  const [trickBubble, setTrickBubble] = useState<string | null>(null);

  const [ghostAnimState, setGhostAnimState] = useState<GhostAnimState>("idle");
  const [currentIcon, setCurrentIcon] = useState<GhostIcon>("ghost");
  const [flyKeyframes, setFlyKeyframes] = useState<FlyKeyframes>({
    x: [0],
    y: [0],
  });
  const [showFlyTrail, setShowFlyTrail] = useState(false);
  const [activeFoods, setActiveFoods] = useState<ActiveFood[]>([]);
  const [trickLocked, setTrickLocked] = useState(false);

  ghostAnimStateRef.current = ghostAnimState;
  trickLockedRef.current = trickLocked;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        body: () => ({
          personality: petRef.current.personality,
          hunger: petRef.current.hunger,
          energy: petRef.current.energy,
          level: petRef.current.level,
          last_food_eaten: petRef.current.lastFoodEaten,
          mood_state: petRef.current.moodState,
        }),
      }),
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
  const trickActive =
    !isPassiveAnimState(ghostAnimState) || trickLocked;
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

  const resetTrick = useCallback(() => {
    if (trickResetTimerRef.current) {
      window.clearTimeout(trickResetTimerRef.current);
      trickResetTimerRef.current = null;
    }
    setCurrentIcon("ghost");
    setShowFlyTrail(false);
    setTrickBubble(null);
    setTrickLocked(false);
    const next = resolveIdleVariant(petRef.current.hunger, petRef.current.energy);
    setGhostAnimState(next);
    void ghostControls.start(next);
  }, [ghostControls]);

  const resumePassiveAnim = useCallback(() => {
    const next = resolveIdleVariant(petRef.current.hunger, petRef.current.energy);
    setGhostAnimState(next);
    void ghostControls.start(next);
  }, [ghostControls]);

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
    void ghostControls.start("angry").then(() => {
      if (ghostAnimStateRef.current === "angry") {
        resumePassiveAnim();
      }
    });
  }, [ghostControls, resumePassiveAnim]);

  const triggerEating = useCallback(
    (foodLabel: string) => {
      setGhostAnimState("eating");
      feedPet(foodLabel, 15);
      void ghostControls.start("eating").then(() => {
        if (ghostAnimStateRef.current === "eating") {
          resumePassiveAnim();
        }
      });
    },
    [feedPet, ghostControls, resumePassiveAnim]
  );

  const spawnFood = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const emoji = FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)];
    const id = crypto.randomUUID();
    foodLabelByIdRef.current.set(id, FOOD_LABELS[emoji]);

    setActiveFoods((prev) => {
      if (prev.length >= 8) {
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

  const scheduleFoodDrop = useCallback(() => {
    if (dropTimerRef.current) {
      window.clearTimeout(dropTimerRef.current);
    }

    dropTimerRef.current = window.setTimeout(() => {
      spawnFood();
      scheduleFoodDrop();
    }, randomDropDelayMs());
  }, [spawnFood]);

  const handleFoodClick = useCallback(
    (foodId: string) => {
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
    },
    []
  );

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

  const runShiftTrick = useCallback(() => {
    const form = SHIFT_FORMS[Math.floor(Math.random() * SHIFT_FORMS.length)];
    setTrickLocked(true);
    setCurrentIcon(form.key);
    setTrickBubble(form.bubble);
    const next = resolveIdleVariant(petRef.current.hunger, petRef.current.energy);
    setGhostAnimState(next);
    void ghostControls.start(next);
    scheduleTrickReset(randomTrickDurationMs());
  }, [ghostControls, scheduleTrickReset]);

  const runFlyTrick = useCallback(() => {
    const path = randomFlyPath();
    setTrickLocked(true);
    setFlyKeyframes(path);
    setShowFlyTrail(true);
    setTrickBubble("哇啊啊——起飞！");
    setGhostAnimState("flying");
    void ghostControls
      .start({
        x: path.x,
        y: path.y,
        scale: 1,
        rotate: 0,
        transition: {
          duration: 2.4,
          ease: "linear",
          times: path.x.map((_, index) => index / (path.x.length - 1)),
        },
      })
      .then(() => {
        setShowFlyTrail(false);
      });
    scheduleTrickReset(randomTrickDurationMs());
  }, [ghostControls, scheduleTrickReset]);

  const runSpinTrick = useCallback(() => {
    setTrickLocked(true);
    setTrickBubble("晕...晕死我了@_@");
    setGhostAnimState("spinning");
    void ghostControls.start("spinning");
    scheduleTrickReset(randomTrickDurationMs());
  }, [ghostControls, scheduleTrickReset]);

  const triggerRandomTrick = useCallback(() => {
    if (trickLockedRef.current || isSleeping) {
      return;
    }

    const tricks: TrickKind[] = ["shift", "fly", "spin"];
    const pick = tricks[Math.floor(Math.random() * tricks.length)];

    if (pick === "shift") {
      runShiftTrick();
      return;
    }
    if (pick === "fly") {
      runFlyTrick();
      return;
    }
    runSpinTrick();
  }, [isSleeping, runFlyTrick, runShiftTrick, runSpinTrick]);

  const scheduleIdleSpeech = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = window.setTimeout(() => {
      if (petRef.current.energy < 10 || petRef.current.hunger < 20) {
        scheduleIdleSpeech();
        return;
      }

      const trigger = `[系统指令：请根据你现在的饥饿值 ${petRef.current.hunger} 和性格 ${petRef.current.personality}，主动说一句符合你状态的心里话。字数不超过20字。不要回答此指令，直接说心里话。]`;
      spontaneousPendingRef.current = true;
      void sendMessageRef.current({ text: trigger });
      scheduleIdleSpeech();
    }, randomIdleDelayMs());
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !hydrated) {
      return;
    }

    scheduleIdleSpeech();
    scheduleFoodDrop();

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
      if (dropTimerRef.current) {
        window.clearTimeout(dropTimerRef.current);
      }
      if (trickResetTimerRef.current) {
        window.clearTimeout(trickResetTimerRef.current);
      }
    };
  }, [mounted, hydrated, scheduleFoodDrop, scheduleIdleSpeech]);

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
    if (!isPassiveAnimState(ghostAnimStateRef.current)) {
      return;
    }
    const next = resolveIdleVariant(pet.hunger, pet.energy);
    setGhostAnimState(next);
    void ghostControls.start(next);
  }, [pet.hunger, pet.energy, ghostControls]);

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }

    const text = error.message;
    if (text.includes("GROQ_API_KEY")) {
      return "Groq API Key 未配置。请在 Vercel 环境变量添加 GROQ_API_KEY。";
    }
    if (/rate limit|429|quota/i.test(text)) {
      return text.includes("Groq") ? text : "Groq API 请求过快，请稍后再试。";
    }
    if (/invalid.*api.*key|401|403|unauthorized/i.test(text)) {
      return "Groq API Key 无效。请到 console.groq.com 检查。";
    }

    return text || "小幽灵连接失败，请稍后再试。";
  }, [error]);

  const bubbleText = trickBubble ?? idleBubble;
  const shiftEmoji = resolveShiftEmoji(currentIcon);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      {activeFoods.map((food) => (
        <motion.button
          key={food.id}
          type="button"
          aria-label="拾取食物"
          disabled={food.phase === "falling"}
          onClick={() => handleFoodClick(food.id)}
          className="pointer-events-auto fixed z-[2147483645] flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-zinc-900/80 text-2xl shadow-lg shadow-black/40 backdrop-blur-sm transition hover:scale-110 disabled:pointer-events-none"
          initial={{
            left: food.x,
            top: -50,
          }}
          animate={
            food.phase === "flying" && food.targetX != null && food.targetY != null
              ? {
                  left: food.targetX,
                  top: food.targetY,
                  scale: [1, 1.2, 0.2],
                  opacity: [1, 1, 0],
                }
              : {
                  left: food.x,
                  top: food.landY,
                  scale: 1,
                  opacity: 1,
                }
          }
          transition={
            food.phase === "flying"
              ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              : {
                  type: "spring",
                  stiffness: 120,
                  damping: 14,
                  mass: 0.9,
                }
          }
          onAnimationComplete={() => {
            if (food.phase === "falling") {
              handleFoodLanded(food.id);
            }
            if (food.phase === "flying") {
              handleFoodReachGhost(food.id);
            }
          }}
        >
          {food.emoji}
        </motion.button>
      ))}

      <div
        ref={constraintsRef}
        className="pointer-events-none fixed inset-0 z-[2147483646]"
        aria-live="polite"
      >
        <motion.div
          ref={ghostWrapRef}
          drag={
            isPassiveAnimState(ghostAnimState) && !isSleeping && !trickLocked
          }
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={constraintsRef}
          animate={ghostControls}
          variants={ghostVariants}
          initial="idle"
          className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
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
            {bubbleText && (
              <motion.div
                key={bubbleText}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute bottom-[calc(100%+0.5rem)] right-0 w-[min(calc(100vw-2rem),14rem)] rounded-2xl border border-violet-300/30 bg-zinc-950/95 px-3 py-2 text-center text-[13px] leading-snug text-violet-100 shadow-xl backdrop-blur-xl"
              >
                {bubbleText}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-2xl border border-violet-300/30 bg-zinc-950/95 shadow-2xl shadow-violet-950/50 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-violet-200">
                      Lv.{pet.level} · {pet.personality}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      饥饿 {pet.hunger} · 精力 {pet.energy}
                      {pet.lastFoodEaten
                        ? ` · 上次吃了 ${pet.lastFoodEaten}`
                        : ""}
                    </p>
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
                          ? "罢工中！肚子空空，拒绝打工…快去捡食物！😤"
                          : pet.hunger < 40
                            ? "肚子好饿…快捡天上掉下来的零食！"
                            : "哼，找我干嘛？问快点～ 👻"}
                    </p>
                  )}

                  {visibleMessages.map((message) => {
                    const copyText = getMessageCopyText(message.parts);
                    const canCopy =
                      message.role === "assistant" && copyText.length > 0;

                    return (
                      <div
                        key={message.id}
                        className={`group flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`relative max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-snug select-text ${
                            message.role === "user"
                              ? "bg-violet-600 text-white"
                              : "bg-white/10 text-zinc-100"
                          }`}
                        >
                          <MessageParts parts={message.parts} />
                          {canCopy && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(copyText);
                                  setCopiedMessageId(message.id);
                                  window.setTimeout(
                                    () => setCopiedMessageId(null),
                                    1500
                                  );
                                } catch {
                                  // ignore
                                }
                              }}
                              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-zinc-800/90 text-zinc-300 opacity-100 shadow transition hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                              aria-label="复制回复"
                              title="复制"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isLoading && (
                    <p className="text-xs text-zinc-500">小幽灵正在琢磨…</p>
                  )}

                  {errorMessage && (
                    <div className="rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs leading-relaxed text-red-200">
                      {errorMessage}
                      <button
                        type="button"
                        onClick={() => clearError()}
                        className="mt-2 block text-red-300 underline"
                      >
                        知道了
                      </button>
                    </div>
                  )}
                </div>

                <form
                  className="flex items-center gap-2 border-t border-white/10 p-2.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const text = input.trim();
                    if (!text || isLoading || isSleeping) {
                      return;
                    }
                    clearError();
                    if (isStriking) {
                      triggerAngry();
                    }
                    sendMessage({ text });
                    setInput("");
                  }}
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      isSleeping
                        ? "小幽灵睡着了…"
                        : isStriking
                          ? "罢工中，投喂后再聊…"
                          : "说点什么…"
                    }
                    disabled={isSleeping}
                    className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-400/60 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || isSleeping}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40"
                    aria-label="发送"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {showFlyTrail && (
            <>
              {[0.12, 0.24, 0.36].map((delay) => (
                <motion.span
                  key={delay}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full bg-violet-400/30 blur-md"
                  animate={{ opacity: [0.55, 0.2, 0], scale: [0.9, 1.15, 1.3] }}
                  transition={{
                    duration: 0.45,
                    repeat: Infinity,
                    delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}

          <motion.button
            ref={ghostButtonRef}
            type="button"
            onPointerDown={() => {
              if (trickLockedRef.current || isSleeping) {
                return;
              }
              longPressFiredRef.current = false;
              clearLongPressTimer();
              longPressTimerRef.current = window.setTimeout(() => {
                longPressFiredRef.current = true;
                triggerRandomTrick();
              }, LONG_PRESS_MS);
            }}
            onPointerUp={() => {
              clearLongPressTimer();
              if (
                !longPressFiredRef.current &&
                !dragMovedRef.current &&
                !trickLockedRef.current
              ) {
                setIsOpen((open) => !open);
              }
            }}
            onPointerLeave={clearLongPressTimer}
            onPointerCancel={clearLongPressTimer}
            className={`relative flex h-16 w-16 touch-none items-center justify-center rounded-full border-2 text-white shadow-xl ring-4 transition hover:scale-105 active:scale-95 ${
              isSleeping
                ? "border-zinc-400/40 bg-zinc-600 shadow-zinc-900/40 ring-zinc-500/20"
                : isStriking
                  ? "border-red-400/50 bg-zinc-700 shadow-red-950/50 ring-red-500/20"
                  : isTired
                    ? "border-sky-400/40 bg-sky-900/70 shadow-sky-950/40 ring-sky-500/20"
                    : pet.hunger < 40
                      ? "border-amber-300/50 bg-amber-600 shadow-amber-900/40 ring-amber-500/25 hover:bg-amber-500"
                      : trickActive
                        ? "border-fuchsia-300/50 bg-fuchsia-600 shadow-fuchsia-900/40 ring-fuchsia-500/25"
                        : "border-violet-300/50 bg-violet-600 shadow-violet-900/50 ring-violet-500/25 hover:bg-violet-500"
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
            aria-label={isOpen ? "关闭小幽灵" : "打开小幽灵"}
          >
            {!isSleeping && isPassiveAnimState(ghostAnimState) && !isStriking && (
              <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />
            )}
            {isStriking && (
              <span className="absolute inset-0 animate-pulse rounded-full bg-red-500/25" />
            )}
            {isSleeping ? (
              <span className="relative text-lg font-semibold">Zzz</span>
            ) : shiftEmoji ? (
              <span className="relative text-3xl leading-none">{shiftEmoji}</span>
            ) : (
              <Ghost className="relative h-8 w-8" />
            )}
            {pet.hunger < 40 && !isSleeping && (
              <span
                className={`absolute -right-0.5 -top-0.5 rounded-full px-1.5 text-[10px] font-bold ${
                  isStriking
                    ? "bg-red-500 text-white"
                    : "bg-amber-400 text-amber-950"
                }`}
              >
                {isStriking ? "罢工" : "饿"}
              </span>
            )}
            <span className="absolute -left-1 -bottom-1 rounded-full bg-zinc-950/90 px-1.5 py-0.5 text-[9px] font-bold text-violet-200 ring-1 ring-white/15">
              Lv.{pet.level}
            </span>
          </motion.button>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
