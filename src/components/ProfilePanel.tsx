"use client";

import { motion } from "framer-motion";
import { Mail, Calendar, Sparkles, User } from "lucide-react";
import NicknameEditor from "@/components/NicknameEditor";

type ProfilePanelProps = {
  username: string;
  email: string;
  joinedDate: string | null;
  userId: string;
};

function getInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export default function ProfilePanel({
  username,
  email,
  joinedDate,
  userId,
}: ProfilePanelProps) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10"
      >
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-zinc-400">
          <Sparkles size={12} className="text-zinc-300" />
          Your profile
        </div>

        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5 text-[28px] font-semibold text-white ring-1 ring-white/20">
            {getInitial(username)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Display name
            </p>
            <h2 className="mt-2 text-[32px] font-extralight tracking-tight text-white sm:text-[40px]">
              编辑你的
              <span className="font-semibold text-zinc-100"> 昵称</span>
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-zinc-400">
              好友在聊天和好友列表中会看到此昵称。支持中文、字母、数字和下划线。
            </p>

            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                <User size={12} />
                当前昵称
              </div>
              <NicknameEditor initialUsername={username} variant="dark" />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 grid gap-4 sm:grid-cols-2"
      >
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            <Mail size={12} />
            邮箱
          </div>
          <p className="mt-3 break-all text-[16px] font-medium text-zinc-100">
            {email || "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            <Calendar size={12} />
            注册时间
          </div>
          <p className="mt-3 text-[16px] font-medium text-zinc-100">
            {joinedDate ?? "—"}
          </p>
        </div>
      </motion.div>

      <p className="mt-6 text-[12px] text-zinc-600">
        ID: {userId.slice(0, 8)}…
      </p>
    </div>
  );
}
