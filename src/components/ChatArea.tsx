"use client";

import { usePet } from "@/components/PetProvider";
import PetAssistant from "@/components/PetAssistant";
import PetDashboard from "@/components/PetDashboard";
import WeatherWidget from "@/components/WeatherWidget";
import MapArea from "@/components/MapArea";
import {
  formatEnvironmentLabel,
  type BrisbaneEnvironment,
} from "@/lib/environment";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { BookOpen, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getAvatarGlow(avatar: "ghost" | "puppy") {
  return avatar === "puppy"
    ? "shadow-[0_0_60px_rgba(250,204,21,0.35)] ring-yellow-200/40"
    : "shadow-[0_0_60px_rgba(139,92,246,0.35)] ring-violet-300/30";
}

function isRestaurantSearch(text: string) {
  return /餐厅|饭店|吃|美食|打折|折扣|去哪吃|推荐.*吃|餐馆|午饭|晚饭|早餐|brunch|restaurant|sydney|悉尼|auckland|奥克兰|melbourne|墨尔本/i.test(
    text
  );
}

function getMessageText(parts: UIMessage["parts"]) {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function isSystemTriggerMessage(message: UIMessage) {
  return (
    message.role === "user" &&
    getMessageText(message.parts).startsWith("[系统指令")
  );
}

export default function ChatArea() {
  const { pet, addMemoryLog } = usePet();
  const petRef = useRef(pet);
  petRef.current = pet;

  const envRef = useRef<BrisbaneEnvironment | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [hasChatStarted, setHasChatStarted] = useState(false);
  const [input, setInput] = useState("");
  const [environment, setEnvironment] = useState<BrisbaneEnvironment | null>(
    null
  );
  const [mapCity, setMapCity] = useState("Brisbane");
  const [isSearching, setIsSearching] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const handleEnvironment = useCallback((env: BrisbaneEnvironment) => {
    envRef.current = env;
    setEnvironment(env);
    setMapCity(env.city);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        body: () => {
          const env = envRef.current;
          const labels = env ? formatEnvironmentLabel(env) : null;

          return {
            personality: petRef.current.personality,
            hunger: petRef.current.hunger,
            energy: petRef.current.energy,
            level: petRef.current.loginDays,
            login_days: petRef.current.loginDays,
            last_food_eaten: petRef.current.lastFoodEaten,
            mood_state: petRef.current.moodState,
            memory_logs: petRef.current.memoryLogs,
            environment: env
              ? {
                  ...env,
                  city: env.city,
                  country: env.country,
                  timeOfDay: labels?.timeOfDay ?? env.timeOfDay,
                  weather: labels?.weather ?? env.weather,
                }
              : { city: "Brisbane", country: "Australia", weather: "未知" },
          };
        },
      }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";
  const isStriking = pet.hunger < 20;
  const glow = getAvatarGlow(pet.avatar);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !isSystemTriggerMessage(m)),
    [messages]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isLoading]);

  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type === "tool-remember_preference" &&
          part.state === "output-available" &&
          typeof part.output === "object" &&
          part.output !== null &&
          "content" in part.output
        ) {
          addMemoryLog(String((part.output as { content: string }).content));
        }

        if (
          part.type === "tool-fetch_discounts" &&
          part.state === "output-available" &&
          typeof part.output === "object" &&
          part.output !== null
        ) {
          const output = part.output as { city?: string };
          if (output.city) {
            setMapCity(output.city);
          }
          setMapOpen(true);
        }
      }
    }
  }, [messages, addMemoryLog]);

  const handleSearchComplete = useCallback(() => {
    setIsSearching(false);
    setMapOpen(true);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    if (!hasChatStarted) {
      setHasChatStarted(true);
    }

    if (isRestaurantSearch(text)) {
      setIsSearching(true);
    }

    void sendMessage({ text });
    setInput("");
  };

  const inputForm = (
    <motion.form
      layout
      onSubmit={handleSubmit}
      className={`w-full rounded-[2rem] border bg-white/90 p-2 backdrop-blur-xl dark:bg-zinc-900/90 ${glow} ring-1 ${
        hasChatStarted ? "max-w-2xl flex-1" : "max-w-3xl"
      }`}
    >
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={hasChatStarted ? 2 : 3}
        placeholder={
          isStriking
            ? "宠物罢工中…先喂它掉下来的零食吧"
            : "和你的电子宠物说点什么，或问问悉尼/奥克兰有什么好吃的…"
        }
        className="w-full resize-none bg-transparent px-5 py-4 text-[17px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      <div className="flex items-center justify-between px-3 pb-2">
        <p className="text-[12px] text-zinc-400">
          {pet.avatar === "puppy" ? "🐶 治愈小狗" : "👻 调皮幽灵"} · 澳新全域
        </p>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`rounded-full px-5 py-2 text-[14px] font-medium text-white transition disabled:opacity-40 ${
            pet.avatar === "puppy"
              ? "bg-yellow-500 hover:bg-yellow-400"
              : "bg-violet-600 hover:bg-violet-500"
          }`}
        >
          {isLoading ? "思考中…" : "发送"}
        </button>
      </div>
    </motion.form>
  );

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.12),transparent_55%)]" />

      <WeatherWidget
        city={environment?.city ?? "Brisbane"}
        className="absolute left-4 top-4 z-20"
        onEnvironment={handleEnvironment}
      />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDashboardOpen(true)}
          className="rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-[13px] text-zinc-600 backdrop-blur transition hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            档案室
          </span>
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-[13px] text-zinc-600 backdrop-blur transition hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          进入应用
        </Link>
      </div>

      <LayoutGroup>
        {hasChatStarted && (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex min-h-0 flex-1 flex-col pt-28 pb-[9.5rem]"
          >
            <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-4">
              {mapOpen ? (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                    <p className="text-sm font-semibold text-white">
                      {mapCity} 折扣地图
                    </p>
                    <button
                      type="button"
                      onClick={() => setMapOpen(false)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <MapArea city={mapCity} embedded />
                  </div>
                </motion.div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
                  {visibleMessages.length === 0 && (
                    <p className="text-center text-sm text-zinc-500">
                      对话已开始，问问宠物附近有什么折扣餐厅吧～
                    </p>
                  )}
                  {visibleMessages.map((message) => (
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
                            : "border border-zinc-200/80 bg-white/90 text-zinc-800 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-100"
                        }`}
                      >
                        {getMessageText(message.parts)}
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <p className="text-center text-xs text-zinc-500">
                      宠物正在嗅探澳新美食…
                    </p>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className={
            hasChatStarted
              ? "fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/80 bg-zinc-50/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/90"
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
              isThinking={isLoading && !isSearching}
              isSearching={isSearching}
              onSearchComplete={handleSearchComplete}
            />
            {inputForm}
          </motion.div>

          {!hasChatStarted && (
            <motion.footer
              layout
              className="absolute bottom-6 w-full max-w-md px-6"
            >
              <div className="flex items-center justify-between text-[13px] text-zinc-500">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  Lv.{pet.loginDays}
                </span>
                <span>累计登录 {pet.loginDays} 天</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    pet.avatar === "puppy" ? "bg-yellow-500" : "bg-violet-500"
                  }`}
                  style={{ width: `${pet.hunger}%` }}
                />
              </div>
            </motion.footer>
          )}
        </motion.div>
      </LayoutGroup>

      <PetDashboard open={dashboardOpen} onClose={() => setDashboardOpen(false)} />

      <AnimatePresence>
        {mapOpen && !hasChatStarted && (
          <>
            <motion.button
              type="button"
              aria-label="关闭地图"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMapOpen(false)}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed inset-x-0 bottom-0 z-[56] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-white">
                  <MapPin className="h-4 w-4 text-violet-400" />
                  {mapCity} 折扣地图
                </p>
                <button
                  type="button"
                  onClick={() => setMapOpen(false)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <MapArea city={mapCity} embedded />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
