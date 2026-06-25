"use client";

import { usePet } from "@/components/PetProvider";
import { TROPHY_CATALOG } from "@/lib/pet-trophies";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Package, X } from "lucide-react";
import { useMemo, useState } from "react";

type PetDashboardProps = {
  open: boolean;
  onClose: () => void;
};

type TabId = "trophy" | "memory";

export default function PetDashboard({ open, onClose }: PetDashboardProps) {
  const { pet, setEquippedItem } = usePet();
  const [tab, setTab] = useState<TabId>("trophy");

  const ownedIds = useMemo(
    () => new Set(pet.backpack.map((item) => item.id)),
    [pet.backpack]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="关闭"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            className="fixed left-1/2 top-1/2 z-[61] flex max-h-[min(88vh,720px)] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold text-white">
                  宠物档案室
                </p>
                <p className="text-[12px] text-zinc-500">
                  Lv.{pet.loginDays} · 累计登录 {pet.loginDays} 天
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setTab("trophy")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                  tab === "trophy"
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <Package className="h-4 w-4" />
                战利品柜
              </button>
              <button
                type="button"
                onClick={() => setTab("memory")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                  tab === "memory"
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-zinc-400 hover:text-white"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                记忆日记
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === "trophy" ? (
                <div className="grid grid-cols-3 gap-3">
                  {TROPHY_CATALOG.map((trophy) => {
                    const owned = ownedIds.has(trophy.id);
                    const unlocked =
                      trophy.unlockDays === 0
                        ? owned
                        : pet.loginDays >= trophy.unlockDays;
                    const equipped = pet.equippedItem === trophy.name;

                    return (
                      <button
                        key={trophy.id}
                        type="button"
                        disabled={!owned}
                        onClick={() => owned && setEquippedItem(trophy.name)}
                        className={`flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                          equipped
                            ? "border-violet-400 bg-violet-500/20 ring-2 ring-violet-400/40"
                            : owned
                              ? "border-white/10 bg-white/5 hover:border-violet-300/40 hover:bg-violet-500/10"
                              : unlocked
                                ? "border-dashed border-white/10 bg-white/[0.02] opacity-80"
                                : "border-white/5 bg-zinc-900/50 opacity-45"
                        }`}
                      >
                        <span
                          className={`text-3xl ${!owned ? "grayscale" : ""}`}
                        >
                          {trophy.emoji}
                        </span>
                        <p className="mt-2 line-clamp-2 text-[11px] font-medium text-zinc-200">
                          {trophy.name}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          {owned
                            ? equipped
                              ? "已装备"
                              : "点击装备"
                            : unlocked
                              ? "待收集"
                              : `Lv.${trophy.unlockDays}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {pet.memoryLogs.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-[13px] text-zinc-500">
                      日记本还是空的，多和宠物聊聊你的口味吧～
                    </p>
                  ) : (
                    pet.memoryLogs.map((log, index) => (
                      <div
                        key={`${log.date}-${index}`}
                        className="rounded-2xl border border-amber-200/10 bg-amber-950/20 px-4 py-3 shadow-inner"
                      >
                        <p className="text-[12px] font-medium text-amber-200/80">
                          📝 {log.date}
                        </p>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-200">
                          {log.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
