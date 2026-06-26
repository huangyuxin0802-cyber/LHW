"use client";

import { motion } from "framer-motion";
import { Mail, Calendar, Sparkles, User } from "lucide-react";
import NicknameEditor from "@/components/NicknameEditor";
import { ui } from "@/lib/ui";

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
      <div aria-hidden className={`absolute ${ui.pageGlow}`} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={ui.card}
      >
        <div className={`mb-8 ${ui.badge}`}>
          <Sparkles size={12} className="text-violet-500" />
          个人资料
        </div>

        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          <div
            className={`h-20 w-20 shrink-0 text-[28px] font-semibold ${ui.avatar}`}
          >
            {getInitial(username)}
          </div>

          <div className="min-w-0 flex-1">
            <p className={ui.eyebrow}>Display name</p>
            <h2 className={`mt-2 ${ui.titleLg}`}>
              编辑你的
              <span className="bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text font-semibold text-transparent dark:from-violet-300 dark:to-violet-200">
                {" "}
                昵称
              </span>
            </h2>
            <p className={`mt-3 max-w-lg ${ui.subtitle}`}>
              好友在聊天和好友列表中会看到此昵称。支持中文、字母、数字和下划线。
            </p>

            <div className={`mt-6 ${ui.cardInner}`}>
              <div className={`mb-2 flex items-center gap-2 ${ui.eyebrow}`}>
                <User size={12} />
                当前昵称
              </div>
              <NicknameEditor initialUsername={username} />
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
        <div className={ui.cardAccent}>
          <div className={`flex items-center gap-2 ${ui.eyebrow}`}>
            <Mail size={12} className="text-sky-500" />
            邮箱
          </div>
          <p className={`mt-3 break-all text-[16px] font-medium ${ui.statValueSm}`}>
            {email || "—"}
          </p>
        </div>

        <div className={ui.cardSm}>
          <div className={`flex items-center gap-2 ${ui.eyebrow}`}>
            <Calendar size={12} className="text-amber-500" />
            注册时间
          </div>
          <p className={`mt-3 text-[16px] font-medium ${ui.statValueSm}`}>
            {joinedDate ?? "—"}
          </p>
        </div>
      </motion.div>

      <p className={`mt-6 text-[12px] ${ui.sidebarMuted}`}>
        ID: {userId.slice(0, 8)}…
      </p>
    </div>
  );
}
