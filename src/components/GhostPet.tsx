"use client";

import { usePet } from "@/components/PetProvider";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Ghost, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FallingCookie = {
  id: string;
  startX: number;
  targetX: number;
  targetY: number;
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

export default function GhostPet() {
  const { pet, feedPet, hydrated } = usePet();
  const petRef = useRef(pet);
  petRef.current = pet;

  const constraintsRef = useRef<HTMLDivElement>(null);
  const ghostButtonRef = useRef<HTMLButtonElement>(null);
  const dragMovedRef = useRef(false);
  const spontaneousPendingRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isChewing, setIsChewing] = useState(false);
  const [fallingCookies, setFallingCookies] = useState<FallingCookie[]>([]);
  const [idleBubble, setIdleBubble] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        body: () => ({
          personality: petRef.current.personality,
          hunger: petRef.current.hunger,
          energy: petRef.current.energy,
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
  const visibleMessages = useMemo(
    () => messages.filter((message) => !isSystemTriggerMessage(message)),
    [messages]
  );

  const scheduleIdleSpeech = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = window.setTimeout(() => {
      if (petRef.current.energy < 10) {
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

    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [mounted, hydrated, scheduleIdleSpeech]);

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

  const handleFeed = () => {
    const rect = ghostButtonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const cookie: FallingCookie = {
      id: crypto.randomUUID(),
      startX: window.innerWidth / 2,
      targetX: rect.left + rect.width / 2,
      targetY: rect.top + rect.height / 2,
    };

    setFallingCookies((prev) => [...prev, cookie]);
  };

  const handleCookieLanded = (cookieId: string) => {
    setFallingCookies((prev) => prev.filter((item) => item.id !== cookieId));
    setIsChewing(true);
    feedPet(20);
    window.setTimeout(() => setIsChewing(false), 700);
  };

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        onClick={handleFeed}
        className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[2147483645] -translate-x-1/2 rounded-full border border-amber-300/40 bg-amber-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-900/30 backdrop-blur transition hover:bg-amber-400"
      >
        🍪 喂食
      </button>

      {fallingCookies.map((cookie) => (
        <motion.div
          key={cookie.id}
          className="pointer-events-none fixed z-[2147483645] text-2xl"
          style={{ position: "fixed" }}
          initial={{ left: cookie.startX, top: -32, x: "-50%" }}
          animate={{ left: cookie.targetX, top: cookie.targetY, x: "-50%" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => handleCookieLanded(cookie.id)}
        >
          🍪
        </motion.div>
      ))}

      <div
        ref={constraintsRef}
        className="pointer-events-none fixed inset-0 z-[2147483646]"
        aria-live="polite"
      >
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.1}
          dragConstraints={constraintsRef}
          className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
          onDragStart={() => {
            dragMovedRef.current = true;
          }}
          onDragEnd={() => {
            window.setTimeout(() => {
              dragMovedRef.current = false;
            }, 80);
          }}
        >
          <AnimatePresence>
            {idleBubble && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute bottom-[calc(100%+0.5rem)] right-0 w-[min(calc(100vw-2rem),14rem)] rounded-2xl border border-violet-300/30 bg-zinc-950/95 px-3 py-2 text-center text-[13px] leading-snug text-violet-100 shadow-xl backdrop-blur-xl"
              >
                {idleBubble}
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
                      {pet.personality} · 电子宠物
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      饥饿 {pet.hunger} · 精力 {pet.energy}
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
                        : pet.hunger < 30
                          ? "肚子好饿…有饼干吗？🍪"
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
                    sendMessage({ text });
                    setInput("");
                  }}
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={isSleeping ? "小幽灵睡着了…" : "说点什么…"}
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

          <motion.button
            ref={ghostButtonRef}
            type="button"
            onClick={() => {
              if (dragMovedRef.current) {
                return;
              }
              setIsOpen((open) => !open);
            }}
            animate={
              isChewing
                ? { scale: [1, 1.12, 0.92, 1.08, 1], y: 0 }
                : isSleeping
                  ? { y: 0 }
                  : { y: [0, -6, 0] }
            }
            transition={
              isChewing
                ? { duration: 0.7 }
                : isSleeping
                  ? { duration: 0 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
            }
            className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 text-white shadow-xl ring-4 transition hover:scale-105 active:scale-95 ${
              isSleeping
                ? "border-zinc-400/40 bg-zinc-600 shadow-zinc-900/40 ring-zinc-500/20"
                : pet.hunger < 30
                  ? "border-amber-300/50 bg-amber-600 shadow-amber-900/40 ring-amber-500/25 hover:bg-amber-500"
                  : "border-violet-300/50 bg-violet-600 shadow-violet-900/50 ring-violet-500/25 hover:bg-violet-500"
            }`}
            aria-label={isOpen ? "关闭小幽灵" : "打开小幽灵"}
          >
            {!isSleeping && (
              <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />
            )}
            {isSleeping ? (
              <span className="relative text-lg font-semibold">Zzz</span>
            ) : (
              <Ghost className="relative h-8 w-8" />
            )}
            {pet.hunger < 30 && !isSleeping && (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-950">
                饿
              </span>
            )}
          </motion.button>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
