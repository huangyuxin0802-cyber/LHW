"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { ui } from "@/lib/ui";

type ThemeToggleProps = {
  compact?: boolean;
};

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      className={
        compact
          ? `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${ui.sidebarLink}`
          : `flex h-9 w-9 items-center justify-center rounded-full border transition ${ui.divider} ${ui.sidebarLink}`
      }
    >
      {isDark ? <Sun size={compact ? 18 : 16} /> : <Moon size={compact ? 18 : 16} />}
      {compact && <span>{isDark ? "浅色模式" : "深色模式"}</span>}
    </button>
  );
}
