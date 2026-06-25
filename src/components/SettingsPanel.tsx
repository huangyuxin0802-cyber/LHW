"use client";

import { usePet } from "@/components/PetProvider";
import { useTheme } from "@/components/ThemeProvider";
import { PET_PERSONALITIES } from "@/types/pet";
import { ui } from "@/lib/ui";

function StatBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "sky";
}) {
  const fill =
    tone === "amber"
      ? "bg-amber-500 dark:bg-amber-400"
      : "bg-sky-500 dark:bg-sky-400";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className={ui.label}>{label}</span>
        <span className={`tabular-nums font-medium ${ui.textPrimary}`}>
          {value}/100
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fill}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function SettingsPanel() {
  const { theme, toggleTheme } = useTheme();
  const { pet, setPersonality } = usePet();

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
          </div>
        </div>
      </div>
    </section>
  );
}
