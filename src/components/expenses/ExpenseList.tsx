"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { formatMoney, getCategoryColor } from "@/lib/expense-utils";
import type { DayGroup } from "@/lib/expense-utils";
import { ui } from "@/lib/ui";

type ExpenseListProps = {
  groups: DayGroup[];
  onDelete: (id: string) => void;
};

function TransactionRow({
  item,
  onDelete,
}: {
  item: DayGroup["items"][number];
  onDelete: (id: string) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);

  const isIncome = item.type === "income";
  const title = item.description.trim() || item.category;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex w-16 items-center justify-center bg-zinc-200/90 dark:bg-zinc-800/80"
        aria-hidden
      >
        <Trash2 size={16} className="text-red-600/80 dark:text-red-400/50" />
      </div>

      <div
        className={`group relative flex items-center justify-between px-4 py-3.5 transition-transform ${ui.listItem}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={(e) => {
          startXRef.current = e.touches[0].clientX;
          setSwiping(true);
        }}
        onTouchMove={(e) => {
          if (!swiping) return;
          const delta = e.touches[0].clientX - startXRef.current;
          setOffsetX(Math.max(-64, Math.min(0, delta)));
        }}
        onTouchEnd={() => {
          setSwiping(false);
          if (offsetX < -32) {
            onDelete(item.id);
          }
          setOffsetX(0);
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${getCategoryColor(item.category)}22`,
              color: getCategoryColor(item.category),
            }}
          >
            <CategoryIcon category={item.category} size={16} />
          </div>
          <div className="min-w-0">
            <p className={`truncate text-[15px] font-medium ${ui.textPrimary}`}>
              {title}
            </p>
            <span className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-400">
              {item.category}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-3">
          <span
            className={`text-[15px] font-semibold tabular-nums ${
              isIncome
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {isIncome ? "+" : "-"} ¥{formatMoney(item.amount)}
          </span>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="hidden rounded-lg p-1.5 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-600 dark:hover:bg-white/[0.04] dark:hover:text-red-400/70 sm:inline-flex"
            aria-label="删除"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseList({ groups, onDelete }: ExpenseListProps) {
  if (groups.length === 0) {
    return (
      <div className={`px-6 py-14 text-center ${ui.empty}`}>
        <p className="text-[15px]">还没有记账记录</p>
        <p className={`mt-1 text-[13px] ${ui.label}`}>记一笔开始吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const groupPositive = group.total >= 0;

        return (
          <section key={group.dateKey}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className={`text-[13px] font-semibold ${ui.label}`}>
                {group.label}
              </h3>
              <span
                className={`text-[13px] tabular-nums ${
                  groupPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {groupPositive ? "+" : "-"}¥{formatMoney(Math.abs(group.total))}
              </span>
            </div>
            <div className={`space-y-2 p-2 ${ui.cardInner}`}>
              {group.items.map((item) => (
                <TransactionRow key={item.id} item={item} onDelete={onDelete} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
