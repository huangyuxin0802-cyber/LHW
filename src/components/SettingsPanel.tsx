"use client";

import { usePet } from "@/components/PetProvider";
import { useTheme } from "@/components/ThemeProvider";
import { PET_PERSONALITIES, type PetMoodState } from "@/types/pet";
import { ui } from "@/lib/ui";

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
  const { pet, setPersonality } = usePet();
  const xpToNext = pet.level * 100 - pet.xp;
  const isStriking = pet.hunger < 20;

  return (
    <section className={`mt-6 ${ui.card}`}>
      <p className={ui.eyebrow}>Settings</p>
      <h2 className={`mt-2 text-[22px] font-semibold ${ui.textPrimary}`}>
        网站与小幽灵设置
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
            小幽灵设置
          </h3>

          <div className={`mt-3 space-y-4 rounded-2xl border p-4 ${ui.cardInner}`}>
            <div className="flex items-center justify-between rounded-xl bg-violet-500/10 px-3 py-2.5 dark:bg-violet-500/15">
              <div>
                <p className={`text-[14px] font-semibold ${ui.textPrimary}`}>
                  Lv.{pet.level} 电子宠物
                </p>
                <p className={`mt-0.5 text-[12px] ${ui.label}`}>
                  经验 {pet.xp} · 距下一级还需 {Math.max(0, xpToNext)} XP
                </p>
              </div>
              <span className="text-2xl" aria-hidden>
                👻
              </span>
            </div>

            {isStriking && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-600 dark:text-red-300">
                罢工中！饥饿值低于 20，小幽灵拒绝聊天。点击屏幕掉落的 🍪🍬🍎 喂它。
              </div>
            )}

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
              <StatBar label="XP 经验" value={pet.xp} tone="violet" max={pet.level * 100} />
            </div>

            <p className={`text-[12px] leading-relaxed ${ui.label}`}>
              玩法提示：右下角可拖动小幽灵；长按 800ms 触发随机彩蛋；天上会掉落食物，点击喂它升级。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
