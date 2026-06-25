"use client";

import { usePet } from "@/components/PetProvider";
import PetDashboard from "@/components/PetDashboard";
import { useTheme } from "@/components/ThemeProvider";
import { PET_AVATARS, PET_PERSONALITIES, type PetMoodState } from "@/types/pet";
import { ui } from "@/lib/ui";
import { useState } from "react";

const MOOD_LABELS: Record<PetMoodState, string> = {
  happy: "开心 😊",
  starving: "极度饥饿 · 罢工中 😤",
  angry: "烦躁 😠",
  tired: "困倦 😴",
  neutral: "平静",
};

function StatBar({
  label,
  value,
  tone,
  max = 100,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky" | "violet";
  max?: number;
}) {
  const fill =
    tone === "amber"
      ? "bg-amber-500 dark:bg-amber-400"
      : tone === "sky"
        ? "bg-sky-500 dark:bg-sky-400"
        : "bg-violet-500 dark:bg-violet-400";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className={ui.label}>{label}</span>
        <span className={`tabular-nums font-medium ${ui.textPrimary}`}>
          {value}/{max}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fill}`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const { theme, toggleTheme } = useTheme();
  const { pet, setPersonality, setAvatar, setDropFrequency } = usePet();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const isStriking = pet.hunger < 20;

  return (
    <section className={`mt-6 ${ui.card}`}>
      <p className={ui.eyebrow}>Settings</p>
      <h2 className={`mt-2 text-[22px] font-semibold ${ui.textPrimary}`}>
        网站与电子宠物设置
      </h2>

      <div className="mt-8 space-y-8">
        <div>
          <h3 className={`text-[15px] font-semibold ${ui.textPrimary}`}>
            网站基础设置
          </h3>
          <div
            className={`mt-3 flex items-center justify-between rounded-2xl border px-4 py-3 ${ui.cardInner}`}
          >
            <div>
              <p className={`text-[14px] font-medium ${ui.textPrimary}`}>
                暗黑模式
              </p>
              <p className={`mt-0.5 text-[12px] ${ui.label}`}>
                当前：{theme === "dark" ? "深色" : "浅色"}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative h-7 w-12 rounded-full transition ${
                theme === "dark" ? "bg-violet-600" : "bg-zinc-300"
              }`}
              aria-label="切换暗黑模式"
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  theme === "dark" ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div>
          <h3 className={`text-[15px] font-semibold ${ui.textPrimary}`}>
            电子宠物
          </h3>

          <div className={`mt-3 space-y-4 rounded-2xl border p-4 ${ui.cardInner}`}>
            <div className="flex items-center justify-between rounded-xl bg-violet-500/10 px-3 py-2.5 dark:bg-violet-500/15">
              <div>
                <p className={`text-[14px] font-semibold ${ui.textPrimary}`}>
                  Lv.{pet.loginDays} · 累计登录 {pet.loginDays} 天
                </p>
                <p className={`mt-0.5 text-[12px] ${ui.label}`}>
                  经验 {pet.xp} · 掉落间隔 {pet.dropFrequency} 秒
                </p>
              </div>
              <span className="text-2xl" aria-hidden>
                {pet.avatar === "puppy" ? "🐶" : "👻"}
              </span>
            </div>

            {isStriking && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-300">
                罢工中！饥饿值低于 20。点击掉落的零食喂它。
              </div>
            )}

            <div>
              <p className={`mb-2 text-[13px] font-medium ${ui.label}`}>
                形象切换
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PET_AVATARS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAvatar(item)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      pet.avatar === item
                        ? item === "puppy"
                          ? "border-yellow-400 bg-yellow-500/15 ring-2 ring-yellow-400/40"
                          : "border-violet-400 bg-violet-500/15 ring-2 ring-violet-400/40"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl">
                      {item === "puppy" ? "🐶" : "👻"}
                    </span>
                    <p className={`mt-2 text-[14px] font-semibold ${ui.textPrimary}`}>
                      {item === "puppy" ? "治愈小狗" : "调皮幽灵"}
                    </p>
                    <p className={`mt-0.5 text-[11px] ${ui.label}`}>
                      {item === "puppy" ? "黄色温暖主题" : "紫色调皮主题"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="drop-frequency"
                className={`mb-2 flex items-center justify-between text-[13px] font-medium ${ui.label}`}
              >
                <span>零食掉落间隔</span>
                <span className={ui.textPrimary}>{pet.dropFrequency} 秒</span>
              </label>
              <input
                id="drop-frequency"
                type="range"
                min={10}
                max={120}
                step={5}
                value={pet.dropFrequency}
                onChange={(event) =>
                  setDropFrequency(Number(event.target.value))
                }
                className="w-full accent-violet-500"
              />
              <p className={`mt-2 text-[12px] ${ui.label}`}>
                太快可能会长胖哦～建议 30 秒左右
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className={`rounded-xl border px-3 py-2 ${ui.cardInner}`}>
                <p className={ui.label}>当前情绪</p>
                <p className={`mt-1 font-medium ${ui.textPrimary}`}>
                  {MOOD_LABELS[pet.moodState]}
                </p>
              </div>
              <div className={`rounded-xl border px-3 py-2 ${ui.cardInner}`}>
                <p className={ui.label}>上一餐</p>
                <p className={`mt-1 font-medium ${ui.textPrimary}`}>
                  {pet.lastFoodEaten || "还没有投喂记录"}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="ghost-personality"
                className={`mb-2 block text-[13px] font-medium ${ui.label}`}
              >
                性格
              </label>
              <select
                id="ghost-personality"
                value={pet.personality}
                onChange={(event) =>
                  setPersonality(
                    event.target.value as (typeof PET_PERSONALITIES)[number]
                  )
                }
                className={ui.input}
              >
                {PET_PERSONALITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <p className={`text-[13px] font-medium ${ui.label}`}>状态监控仪</p>
              <StatBar label="Hunger 饥饿" value={pet.hunger} tone="amber" />
              <StatBar label="Energy 精力" value={pet.energy} tone="sky" />
            </div>

            <button
              type="button"
              onClick={() => setDashboardOpen(true)}
              className="w-full rounded-2xl border border-violet-300/30 bg-violet-500/10 px-4 py-3 text-[14px] font-medium text-violet-700 transition hover:bg-violet-500/15 dark:text-violet-200"
            >
              打开战利品柜与记忆日记本
            </button>
          </div>
        </div>
      </div>

      <PetDashboard
        open={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
      />
    </section>
  );
}
