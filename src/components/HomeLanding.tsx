"use client";

import { usePet } from "@/components/PetProvider";
import PetAssistant from "@/components/PetAssistant";
import PetDashboard from "@/components/PetDashboard";
import DiscountMap from "@/components/discount-map/DiscountMap";
import {
  formatEnvironmentLabel,
  getBrisbaneEnvironment,
  type BrisbaneEnvironment,
} from "@/lib/environment";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getAvatarGlow(avatar: "ghost" | "puppy") {
  return avatar === "puppy"
    ? "shadow-[0_0_60px_rgba(250,204,21,0.35)] ring-yellow-200/40"
    : "shadow-[0_0_60px_rgba(139,92,246,0.35)] ring-violet-300/30";
}

function isRestaurantSearch(text: string) {
  return /餐厅|饭店|吃|美食|打折|折扣|去哪吃|推荐.*吃|餐馆|午饭|晚饭|早餐|brunch|restaurant/i.test(
    text
  );
}

export default function HomeLanding() {
  const { pet, addMemoryLog } = usePet();
  const petRef = useRef(pet);
  petRef.current = pet;

  const envRef = useRef<BrisbaneEnvironment | null>(null);

  const [input, setInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<BrisbaneEnvironment | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  useEffect(() => {
    void getBrisbaneEnvironment().then((env) => {
      envRef.current = env;
      setEnvironment(env);
    });
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
                  timeOfDay: labels?.timeOfDay ?? env.timeOfDay,
                  weather: labels?.weather ?? env.weather,
                }
              : null,
          };
        },
      }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const isLoading = status === "submitted" || status === "streaming";
  const isStriking = pet.hunger < 20;
  const glow = getAvatarGlow(pet.avatar);

  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    const text = last.parts
      .filter((p) => p.type === "text")
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");
    if (text) setReply(text);
  }, [messages]);

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
      }
    }
  }, [messages, addMemoryLog]);

  const handleSearchComplete = useCallback(() => {
    setIsSearching(false);
    setMapOpen(true);
  }, []);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.12),transparent_55%)]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDashboardOpen(true)}
          className="rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-[13px] text-zinc-600 backdrop-blur transition hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:text-white"
        >
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            档案室
          </span>
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-[13px] text-zinc-600 backdrop-blur transition hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:text-white"
        >
          进入应用
        </Link>
      </div>

      {environment && (
        <p className="absolute left-4 top-4 z-10 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1 text-[12px] text-zinc-500 backdrop-blur dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-400">
          布里斯班 · {formatEnvironmentLabel(environment).weather}
          {environment.temperature != null
            ? ` · ${Math.round(environment.temperature)}°C`
            : ""}
        </p>
      )}

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        <PetAssistant
          mode="home"
          className="mb-2"
          environment={environment}
          isThinking={isLoading && !isSearching}
          isSearching={isSearching}
          onSearchComplete={handleSearchComplete}
        />

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={(event) => {
            event.preventDefault();
            const text = input.trim();
            if (!text || isLoading) return;

            if (isRestaurantSearch(text)) {
              setIsSearching(true);
            }

            void sendMessage({ text });
            setInput("");
          }}
          className={`relative mt-6 w-full rounded-[2rem] border bg-white/90 p-2 backdrop-blur-xl dark:bg-zinc-900/90 ${glow} ring-1`}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            placeholder={
              isStriking
                ? "宠物罢工中…先喂它掉下来的零食吧"
                : "和你的电子宠物说点什么，或问问附近有什么好吃的…"
            }
            className="w-full resize-none bg-transparent px-5 py-4 text-[17px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[12px] text-zinc-400">
              {pet.avatar === "puppy" ? "🐶 治愈小狗模式" : "👻 调皮幽灵模式"}
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

        {reply && (
          <p className="mt-4 max-w-xl text-center text-[15px] text-zinc-600 dark:text-zinc-300">
            {reply}
          </p>
        )}
      </div>

      <footer className="absolute bottom-6 z-10 w-full max-w-md px-6">
        <div className="flex items-center justify-between text-[13px] text-zinc-500 dark:text-zinc-400">
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
        <p className="mt-1 text-center text-[11px] text-zinc-400">
          饥饿值 {pet.hunger}/100
        </p>
      </footer>

      <PetDashboard open={dashboardOpen} onClose={() => setDashboardOpen(false)} />

      <AnimatePresence>
        {mapOpen && (
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
                  宠物叼回来的折扣地图
                </p>
                <button
                  type="button"
                  onClick={() => setMapOpen(false)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <DiscountMap />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
