"use client";

import { usePet } from "@/components/PetProvider";
import PetAssistant from "@/components/PetAssistant";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

function getAvatarGlow(avatar: "ghost" | "puppy") {
  return avatar === "puppy"
    ? "shadow-[0_0_60px_rgba(250,204,21,0.35)] ring-yellow-200/40"
    : "shadow-[0_0_60px_rgba(139,92,246,0.35)] ring-violet-300/30";
}

export default function HomeLanding() {
  const { pet } = usePet();
  const petRef = useRef(pet);
  petRef.current = pet;

  const [input, setInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        body: () => ({
          personality: petRef.current.personality,
          hunger: petRef.current.hunger,
          energy: petRef.current.energy,
          level: petRef.current.loginDays,
          login_days: petRef.current.loginDays,
          last_food_eaten: petRef.current.lastFoodEaten,
          mood_state: petRef.current.moodState,
        }),
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

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(139,92,246,0.12),transparent_55%)]" />

      <Link
        href="/dashboard"
        className="absolute right-4 top-4 z-10 rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-[13px] text-zinc-600 backdrop-blur transition hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:text-white"
      >
        进入应用
      </Link>

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        <PetAssistant mode="home" className="mb-2" />

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={(event) => {
            event.preventDefault();
            const text = input.trim();
            if (!text || isLoading) return;
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
                : "和你的电子宠物说点什么…"
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
    </div>
  );
}
