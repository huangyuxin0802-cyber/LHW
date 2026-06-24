"use client";

import type { ExpenseView } from "@/types/expense";
import { ui } from "@/lib/ui";

type ViewToggleProps = {
  view: ExpenseView;
  onChange: (view: ExpenseView) => void;
};

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const options: { id: ExpenseView; label: string }[] = [
    { id: "list", label: "记账列表" },
    { id: "stats", label: "统计图表" },
  ];

  return (
    <div className="flex rounded-xl bg-zinc-200/80 p-1 dark:bg-white/10">
      {options.map((opt) => {
        const active = view === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition ${
              active
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
