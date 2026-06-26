"use client";

import { usePet } from "@/components/PetProvider";
import AssistantMessageBubble from "@/components/AssistantMessageBubble";
import DesktopOrbBall, { type OrbReaction } from "@/components/DesktopOrbBall";
import DesktopPetSettings from "@/components/DesktopPetSettings";
import PetAssistant from "@/components/PetAssistant";
import PetDashboard from "@/components/PetDashboard";
import { useLocale } from "@/components/LocaleProvider";
import WeatherWidget from "@/components/WeatherWidget";
import { type BrisbaneEnvironment } from "@/lib/environment";
import {
  buildPetSystemPrompt,
  getStrikeMessages,
  sanitizePetReply,
} from "@/lib/pet-chat-prompt";
import { getDesktopStrings } from "@/lib/desktop-i18n";
import {
  getDesktopUpdateSnapshot,
  subscribeDesktopUpdate,
} from "@/lib/desktop-updater";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { BookOpen, Minimize2, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useUsername } from "@/hooks/useUsername";
import {
  setDesktopPetOrbMode,
  setDesktopPetPanelMode,
  startTauriWindowDrag,
  useIsTauri,
} from "@/lib/tauri-desktop";
import {
  addStandbyMessage,
  canReceiveMoreStandby,
  clearStandbyInbox,
  consumeUnreadForChat,
  generateStandbyMessage,
  hasUnreadStandby,
  randomStandbyDelayMs,
} from "@/lib/standby-inbox";
import { useCallback, useEffect, useRef, useState } from "react";

const ORB_LONG_PRESS_MS = 650;
const ORB_DOUBLE_TAP_MS = 320;

const ORB_REACTIONS: { bubble: string; reaction: OrbReaction }[] = [
  { bubble: "嘿！别捏我的脸～", reaction: "wiggle" },
  { bubble: "再摸就要收费了！", reaction: "bounce" },
  { bubble: "唔…好困…", reaction: "droop" },
  { bubble: "哇！吓我一跳！", reaction: "startled" },
  { bubble: "今天心情不错～", reaction: "happy" },
  { bubble: "哼，本幽灵很忙的！", reaction: "wiggle" },
];
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const CHAT_HISTORY_KEY = "ghost_pet_chat_history";

type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type GroqStreamChunk = {
  choices?: Array<{
    delta?: { content?: string };
  }>;
};

function createMessageId() {
  return crypto.randomUUID();
}

function getAvatarGlow(avatar: "ghost" | "puppy") {
  return avatar === "puppy"
    ? "shadow-[0_0_60px_rgba(250,204,21,0.35)] ring-yellow-200/40"
    : "shadow-[0_0_60px_rgba(139,92,246,0.35)] ring-violet-300/30";
}

function normalizeStoredMessage(raw: unknown): ChatMessage | null {
  if (typeof raw !== "object" || raw === null || !("role" in raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const role = record.role;
  if (role !== "user" && role !== "assistant") {
    return null;
  }

  if (typeof record.content === "string") {
    return {
      id: typeof record.id === "string" ? record.id : createMessageId(),
      role,
      content: record.content,
    };
  }

  if (Array.isArray(record.parts)) {
    const content = record.parts
      .filter(
        (part): part is { type: string; text?: string } =>
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          (part as { type: string }).type === "text"
      )
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!content) {
      return null;
    }

    return {
      id: typeof record.id === "string" ? record.id : createMessageId(),
      role,
      content,
    };
  }

  return null;
}

function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeStoredMessage)
      .filter((message): message is ChatMessage => Boolean(message));
  } catch {
    return [];
  }
}

function persistChatHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error("[ChatArea] persist history:", error);
  }
}

function toGroqMessages(history: ChatMessage[], systemPrompt: string) {
  return [
    { role: "system" as const, content: systemPrompt },
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

async function streamGroqReply(
  history: ChatMessage[],
  systemPrompt: string,
  onDelta: (content: string) => void,
  signal?: AbortSignal
) {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("未配置 NEXT_PUBLIC_GROQ_API_KEY");
  }

  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: toGroqMessages(history, systemPrompt),
      stream: true,
      temperature: 0.72,
      max_tokens: 220,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Groq API 错误 (${response.status})`);
  }

  if (!response.body) {
    throw new Error("Groq API 未返回可读流");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(payload) as GroqStreamChunk;
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          onDelta(delta);
        }
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}

export default function ChatArea() {
  const { pet, hydrated } = usePet();
  const { locale } = useLocale();
  const t = getDesktopStrings(locale);
  const username = useUsername();
  const { isTauri, ready: tauriReady } = useIsTauri();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFormRef = useRef<HTMLFormElement>(null);
  const historyLoadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<BrisbaneEnvironment | null>(
    null
  );
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const desktopInitRef = useRef(false);
  const orbPointerRef = useRef<{ x: number; y: number } | null>(null);
  const orbLongPressTimerRef = useRef<number | null>(null);
  const orbLongPressFiredRef = useRef(false);
  const orbLastTapAtRef = useRef(0);
  const [orbReaction, setOrbReaction] = useState<OrbReaction>("idle");
  const [orbBubble, setOrbBubble] = useState<string | null>(null);
  const [standbyUnread, setStandbyUnread] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(
    () => getDesktopUpdateSnapshot().state === "available"
  );
  const desktopExpandedRef = useRef(false);

  const isStriking = pet.hunger < 20;
  const glow = getAvatarGlow(pet.avatar);
  const displayName = username ?? "Yuxin";

  const handleEnvironment = useCallback((env: BrisbaneEnvironment) => {
    setEnvironment(env);
  }, []);

  const expandDesktopPanel = useCallback(() => {
    const unreadMessages = consumeUnreadForChat();
    if (unreadMessages.length > 0) {
      setMessages((current) => [...current, ...unreadMessages]);
      setHasChatStarted(true);
    }
    setStandbyUnread(false);
    setDesktopExpanded(true);
    void setDesktopPetPanelMode();
  }, []);

  const collapseDesktopOrb = useCallback(() => {
    setDashboardOpen(false);
    setSettingsOpen(false);
    setDesktopExpanded(false);
    setStandbyUnread(hasUnreadStandby());
    void setDesktopPetOrbMode({ preservePosition: true });
  }, []);

  const handlePanelDragStart = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      if ((event.target as HTMLElement).closest(".tauri-no-drag")) {
        return;
      }
      startTauriWindowDrag();
    },
    []
  );

  const clearOrbLongPress = useCallback(() => {
    if (orbLongPressTimerRef.current) {
      window.clearTimeout(orbLongPressTimerRef.current);
      orbLongPressTimerRef.current = null;
    }
  }, []);

  const triggerOrbReaction = useCallback(() => {
    const pick = ORB_REACTIONS[Math.floor(Math.random() * ORB_REACTIONS.length)];
    setOrbReaction(pick.reaction);
    setOrbBubble(pick.bubble);
    window.setTimeout(() => {
      setOrbReaction("idle");
      setOrbBubble(null);
    }, 2400);
  }, []);

  useEffect(() => {
    desktopExpandedRef.current = desktopExpanded;
  }, [desktopExpanded]);

  useEffect(
    () =>
      subscribeDesktopUpdate((snapshot) => {
        setUpdateAvailable(snapshot.state === "available");
      }),
    []
  );

  useEffect(() => {
    if (!isTauri || !tauriReady) {
      return;
    }

    setStandbyUnread(hasUnreadStandby());
  }, [isTauri, tauriReady]);

  useEffect(() => {
    if (!isTauri || !tauriReady || desktopExpanded) {
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    let first = !hasUnreadStandby();

    const scheduleNext = () => {
      const delay = randomStandbyDelayMs(first);
      first = false;

      timeoutId = window.setTimeout(() => {
        void (async () => {
          if (cancelled || desktopExpandedRef.current) {
            return;
          }

          if (!canReceiveMoreStandby()) {
            scheduleNext();
            return;
          }

          const content = await generateStandbyMessage({
            displayName,
            hunger: pet.hunger,
            energy: pet.energy,
            hour: new Date().getHours(),
          });

          if (cancelled || desktopExpandedRef.current) {
            return;
          }

          addStandbyMessage(content);
          setStandbyUnread(true);
          scheduleNext();
        })();
      }, delay);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    desktopExpanded,
    displayName,
    isTauri,
    pet.energy,
    pet.hunger,
    tauriReady,
  ]);

  useEffect(() => {
    if (!isTauri || desktopInitRef.current) {
      return;
    }
    desktopInitRef.current = true;
    void setDesktopPetOrbMode();
  }, [isTauri]);

  useEffect(() => {
    if (historyLoadedRef.current) {
      return;
    }
    historyLoadedRef.current = true;

    const stored = loadChatHistory();
    if (stored.length > 0) {
      setMessages(stored);
      setHasChatStarted(true);
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    persistChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleClearHistory = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    try {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      clearStandbyInbox();
    } catch (clearError) {
      console.error("[ChatArea] clear history:", clearError);
    }

    setMessages([]);
    setHasChatStarted(false);
    setStandbyUnread(false);
    setError(null);
    setIsLoading(false);
    setClearNotice(t.clearNotice(displayName));
    window.setTimeout(() => setClearNotice(null), 4000);
  }, [displayName, t]);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) {
        return;
      }

      setError(null);

      if (!hasChatStarted) {
        setHasChatStarted(true);
      }

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
      };

      const assistantId = createMessageId();
      const nextHistory = [...messages, userMessage];

      if (isStriking) {
        const strikePool = getStrikeMessages(locale);
        const strikeMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: strikePool[Math.floor(Math.random() * strikePool.length)],
        };
        setMessages([...nextHistory, strikeMessage]);
        return;
      }

      setMessages(nextHistory);
      setIsLoading(true);

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setMessages((current) => [...current, assistantMessage]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const systemPrompt = buildPetSystemPrompt({
          hunger: pet.hunger,
          energy: pet.energy,
          displayName,
          locale,
        });

        await streamGroqReply(
          nextHistory,
          systemPrompt,
          (delta) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: message.content + delta }
                  : message
              )
            );
          },
          controller.signal
        );

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: sanitizePetReply(message.content) }
              : message
          )
        );
      } catch (streamError) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          streamError instanceof Error
            ? streamError.message
            : "小幽灵暂时无法连接 Groq";

        setError(message);
        setMessages((current) =>
          current.filter((message) => message.id !== assistantId)
        );
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsLoading(false);
      }
    },
    [displayName, hasChatStarted, isLoading, isStriking, locale, messages, pet.energy, pet.hunger]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    setInput("");
    void sendUserMessage(text);
  };

  const isDesktopGlassPanel = isTauri && desktopExpanded;

  const inputForm = (
    <motion.form
      ref={chatFormRef}
      layout
      onSubmit={handleSubmit}
      data-tauri-drag-region={isTauri ? false : undefined}
      className={`tauri-no-drag w-full p-2 ${
        isDesktopGlassPanel
          ? "rounded-[1.35rem] border border-white/55 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl backdrop-saturate-150"
          : `rounded-[2rem] border bg-white/90 backdrop-blur-xl dark:bg-zinc-900/90 ${glow} ring-1`
      } ${hasChatStarted ? "max-w-2xl flex-1" : "max-w-3xl"}`}
    >
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            chatFormRef.current?.requestSubmit();
          }
        }}
        rows={hasChatStarted ? 2 : 3}
        placeholder={
          isStriking
            ? isDesktopGlassPanel
              ? t.strikePlaceholder
              : "宠物罢工中…先喂它掉下来的零食吧"
            : isDesktopGlassPanel
              ? t.inputPlaceholder
              : "和你的桌面宠物说点什么…"
        }
        className={`w-full resize-none bg-transparent outline-none ${
          isDesktopGlassPanel
            ? "px-4 py-3 text-[15px] leading-relaxed text-zinc-800 placeholder:text-zinc-500/80"
            : "px-5 py-4 text-[17px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        }`}
      />
      <div className="flex items-center justify-between px-3 pb-2">
        <p className="text-[12px] text-zinc-400">
          {pet.avatar === "puppy"
            ? isDesktopGlassPanel
              ? `🐶 ${t.puppyPet}`
              : "🐶 治愈小狗"
            : isDesktopGlassPanel
              ? `👻 ${t.ghostPet}`
              : "👻 调皮幽灵"}
          {isDesktopGlassPanel ? ` · ${t.companionHint}` : " · 桌面陪伴"}
        </p>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`rounded-full px-5 py-2 text-[14px] font-medium text-white transition disabled:opacity-40 ${
            isDesktopGlassPanel
              ? pet.avatar === "puppy"
                ? "bg-yellow-500/90 shadow-sm backdrop-blur-sm hover:bg-yellow-400/90"
                : "bg-violet-600/90 shadow-sm backdrop-blur-sm hover:bg-violet-500/90"
              : pet.avatar === "puppy"
                ? "bg-yellow-500 hover:bg-yellow-400"
                : "bg-violet-600 hover:bg-violet-500"
          }`}
        >
          {isLoading
            ? isDesktopGlassPanel
              ? t.sending
              : "思考中…"
            : isDesktopGlassPanel
              ? t.send
              : "发送"}
        </button>
      </div>
    </motion.form>
  );

  if (!tauriReady) {
    return <div className="h-screen w-screen bg-transparent" />;
  }

  if (isTauri && !desktopExpanded) {
    return (
      <div className="relative h-screen w-screen rounded-full bg-transparent">
        <div
          className="flex h-full w-full cursor-grab select-none items-center justify-center rounded-full active:cursor-grabbing"
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            orbPointerRef.current = { x: event.clientX, y: event.clientY };
            orbLongPressFiredRef.current = false;
            clearOrbLongPress();
            orbLongPressTimerRef.current = window.setTimeout(() => {
              orbLongPressFiredRef.current = true;
              triggerOrbReaction();
            }, ORB_LONG_PRESS_MS);
            startTauriWindowDrag();
          }}
          onPointerMove={(event) => {
            const start = orbPointerRef.current;
            if (!start) {
              return;
            }
            const moved =
              Math.abs(event.clientX - start.x) > 8 ||
              Math.abs(event.clientY - start.y) > 8;
            if (moved) {
              clearOrbLongPress();
            }
          }}
          onPointerUp={(event) => {
            const start = orbPointerRef.current;
            orbPointerRef.current = null;
            clearOrbLongPress();
            if (!start || event.button !== 0) {
              return;
            }

            if (orbLongPressFiredRef.current) {
              orbLongPressFiredRef.current = false;
              return;
            }

            const moved =
              Math.abs(event.clientX - start.x) > 8 ||
              Math.abs(event.clientY - start.y) > 8;

            if (moved) {
              orbLastTapAtRef.current = 0;
              return;
            }

            const now = Date.now();
            if (now - orbLastTapAtRef.current <= ORB_DOUBLE_TAP_MS) {
              orbLastTapAtRef.current = 0;
              expandDesktopPanel();
              return;
            }

            orbLastTapAtRef.current = now;
          }}
          onPointerCancel={() => {
            orbPointerRef.current = null;
            orbLongPressFiredRef.current = false;
            orbLastTapAtRef.current = 0;
            clearOrbLongPress();
          }}
        >
          <DesktopOrbBall
            level={hydrated ? Math.max(1, pet.loginDays) : 1}
            avatar={pet.avatar}
            reaction={orbReaction}
            bubbleText={orbBubble}
            showUnreadDot={standbyUnread}
          />
        </div>
        <PetDashboard open={dashboardOpen} onClose={() => setDashboardOpen(false)} />
      </div>
    );
  }

  if (isTauri && desktopExpanded) {
    return (
      <div className="h-screen w-screen bg-transparent p-0">
        <div className="desktop-panel-glass relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem]">
          <div
            className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-violet-300/25 via-white/15 to-sky-300/20"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-8 top-8 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-6 bottom-24 h-36 w-36 rounded-full bg-sky-400/15 blur-3xl"
            aria-hidden
          />

          <header className="relative z-10 flex h-11 shrink-0 items-center rounded-t-[1.75rem] border-b border-white/45 bg-white/30 px-1 backdrop-blur-2xl backdrop-saturate-150">
            <div
              className="flex min-w-0 flex-1 cursor-grab items-center gap-2 px-3 active:cursor-grabbing"
              data-tauri-drag-region
              onPointerDown={handlePanelDragStart}
            >
              <span className="text-[13px] font-semibold tracking-tight text-zinc-800/90">
                {t.appTitle}
              </span>
              <span className="truncate text-[11px] text-zinc-600/70">
                {pet.avatar === "puppy" ? t.puppyPet : t.ghostPet}
              </span>
            </div>
            <div className="tauri-no-drag flex items-center gap-0.5 px-2">
              <button
                type="button"
                onClick={collapseDesktopOrb}
                title={t.collapse}
                className="rounded-xl p-1.5 text-zinc-600/80 transition hover:bg-white/40 hover:text-zinc-900"
              >
                <Minimize2 className="h-4 w-4" />
                <span className="sr-only">{t.collapse}</span>
              </button>
              {hasChatStarted && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  title={t.clearChat}
                  className="rounded-xl p-1.5 text-zinc-500/80 transition hover:bg-white/40 hover:text-zinc-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t.clearChat}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="relative rounded-xl px-2 py-1.5 text-[11px] font-medium text-zinc-700/80 transition hover:bg-white/40 hover:text-zinc-900"
              >
                <span className="inline-flex items-center gap-1">
                  <Settings className="h-3.5 w-3.5" />
                  {t.settings}
                </span>
                {updateAvailable && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white/80" />
                )}
              </button>
            </div>
          </header>

          <AnimatePresence>
            {clearNotice && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute left-1/2 top-12 z-30 -translate-x-1/2 rounded-full border border-white/60 bg-white/55 px-4 py-2 text-sm text-violet-800 shadow-lg backdrop-blur-xl"
              >
                {clearNotice}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              <PetAssistant
                mode="home"
                homeLayout="center"
                desktopPanelMode
                environment={environment}
                isThinking={isLoading}
              />
            </div>

            {hasChatStarted ? (
              <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-3.5">
                {messages.length === 0 && (
                  <p className="text-center text-[13px] text-zinc-600/75">
                    {t.chatWelcome}
                  </p>
                )}
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed ${
                        message.role === "user"
                          ? "border border-white/25 bg-violet-600/85 text-white shadow-[0_4px_16px_rgba(91,33,182,0.22)] backdrop-blur-md"
                          : "border border-white/55 bg-white/50 text-zinc-800/95 shadow-[0_2px_12px_rgba(15,23,42,0.06)] backdrop-blur-md"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <AssistantMessageBubble text={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <p className="text-center text-[11px] text-zinc-500/80">
                    {t.thinking}
                  </p>
                )}
                {error && (
                  <p className="text-center text-[11px] text-red-500/90">{error}</p>
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="relative z-10 flex-1" aria-hidden />
            )}

            <div className="tauri-no-drag relative z-10 shrink-0 rounded-b-[1.75rem] border-t border-white/40 bg-white/25 px-3.5 py-2.5 backdrop-blur-2xl backdrop-saturate-150">
              <div className="mx-auto w-full max-w-3xl">
                {!hasChatStarted && (
                  <div className="mb-2 rounded-2xl border border-white/50 bg-white/35 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl">
                    <div className="flex items-center justify-between text-[12px] text-zinc-600/80">
                      <span className="font-medium text-zinc-800/90">
                        Lv.{pet.loginDays}
                      </span>
                      <span>{t.loginDays(pet.loginDays)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/40">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pet.avatar === "puppy"
                            ? "bg-yellow-500/90"
                            : "bg-violet-500/90"
                        }`}
                        style={{ width: hydrated ? `${pet.hunger}%` : "50%" }}
                      />
                    </div>
                  </div>
                )}
                {inputForm}
              </div>
            </div>
          </div>

          <DesktopPetSettings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-transparent">
      {isTauri && (
        <div
          className="fixed inset-0 z-0"
          data-tauri-drag-region
          aria-hidden
        />
      )}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.06),transparent_50%)]" />

      <WeatherWidget
        city={environment?.city ?? "Brisbane"}
        className="tauri-no-drag absolute left-4 top-4 z-20"
        onEnvironment={handleEnvironment}
      />

      <div className="tauri-no-drag absolute right-4 top-4 z-20 flex items-center gap-2">
        {isTauri && (
          <button
            type="button"
            onClick={collapseDesktopOrb}
            title="收起到悬浮球"
            className="rounded-full border border-zinc-200/60 bg-white/60 p-2 text-zinc-500 backdrop-blur transition hover:bg-white/90 hover:text-zinc-800"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            <span className="sr-only">收起到悬浮球</span>
          </button>
        )}
        {hasChatStarted && (
          <button
            type="button"
            onClick={handleClearHistory}
            title="清空对话"
            className="rounded-full border border-zinc-200/60 bg-white/60 p-2 text-zinc-400 backdrop-blur transition hover:border-zinc-300 hover:bg-white/90 hover:text-zinc-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">清空对话</span>
          </button>
        )}
        <button
          type="button"
          data-trophy-room-anchor
          onClick={() => setDashboardOpen(true)}
          className="rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-[13px] text-zinc-600 backdrop-blur transition hover:text-zinc-900"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            档案室
          </span>
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-[13px] text-zinc-600 backdrop-blur transition hover:text-zinc-900"
        >
          设置
        </Link>
      </div>

      <AnimatePresence>
        {clearNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full border border-violet-200/80 bg-white/95 px-4 py-2 text-sm text-violet-700 shadow-lg backdrop-blur"
          >
            {clearNotice}
          </motion.div>
        )}
      </AnimatePresence>

      <LayoutGroup>
        {hasChatStarted && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex min-h-0 flex-1 flex-col pt-28 pb-[9.5rem]"
          >
            <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-4">
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-zinc-500">
                    对话已开始，和桌面上的小幽灵聊聊天吧～
                  </p>
                )}
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                        message.role === "user"
                          ? "bg-violet-600 text-white"
                          : "border border-zinc-200/80 bg-white/90 text-zinc-800 shadow-sm"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <AssistantMessageBubble text={message.content} />
                      ) : (
                        message.content
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <p className="text-center text-xs text-zinc-500">
                    小幽灵正在想怎么回你…
                  </p>
                )}
                {error && (
                  <p className="text-center text-xs text-red-500">{error}</p>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className={
            hasChatStarted
              ? "tauri-no-drag fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/80 bg-white/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"
              : "absolute inset-0 z-10 flex flex-col items-center justify-center px-4"
          }
        >
          <motion.div
            layout
            className={
              hasChatStarted
                ? "mx-auto flex w-full max-w-3xl items-end gap-3"
                : "flex w-full max-w-3xl flex-col items-center"
            }
          >
            <PetAssistant
              mode="home"
              homeLayout={hasChatStarted ? "dock" : "center"}
              className={hasChatStarted ? "shrink-0" : "mb-2"}
              environment={environment}
              isThinking={isLoading}
            />
            {inputForm}
          </motion.div>

          {!hasChatStarted && (
            <motion.footer
              layout
              className="absolute bottom-6 w-full max-w-md px-6"
            >
              <div className="flex items-center justify-between text-[13px] text-zinc-500">
                <span className="font-medium text-zinc-700">Lv.{pet.loginDays}</span>
                <span>累计登录 {pet.loginDays} 天</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    pet.avatar === "puppy" ? "bg-yellow-500" : "bg-violet-500"
                  }`}
                  style={{ width: hydrated ? `${pet.hunger}%` : "50%" }}
                />
              </div>
            </motion.footer>
          )}
        </motion.div>
      </LayoutGroup>

      <PetDashboard open={dashboardOpen} onClose={() => setDashboardOpen(false)} />
    </div>
  );
}
