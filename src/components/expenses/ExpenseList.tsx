"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import { formatMoney } from "@/lib/expense-utils";
import type { DayGroup } from "@/lib/expense-utils";

type ExpenseListProps = {
  groups: DayGroup[];
  onDelete: (id: string) => void;
};

function ExpenseRow({
  item,
  onDelete,
}: {
  item: DayGroup["items"][number];
  onDelete: (id: string) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);

  const noteText = item.note.trim() || item.category;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500"
        aria-hidden
      >
        <Trash2 size={18} className="text-white" />
      </div>

      <div
        className="group relative flex items-center justify-between bg-white px-4 py-3.5 transition-transform"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={(e) => {
          startXRef.current = e.touches[0].clientX;
          setSwiping(true);
        }}
        onTouchMove={(e) => {
          if (!swiping) return;
          const delta = e.touches[0].clientX - startXRef.current;
          setOffsetX(Math.max(-80, Math.min(0, delta)));
        }}
        onTouchEnd={() => {
          setSwiping(false);
          if (offsetX < -40) {
            onDelete(item.id);
          }
          setOffsetX(0);
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <CategoryIcon category={item.category} size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-gray-900">
              {noteText}
            </p>
            <p className="text-[12px] text-gray-400">{item.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-3">
          <span className="text-[15px] font-semibold tabular-nums text-gray-900">
            - {formatMoney(item.amount)}
          </span>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="hidden rounded-lg p-2 text-red-500 opacity-0 transition hover:bg-red-50 group-hover:opacity-100 sm:inline-flex"
            aria-label="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseList({ groups, onDelete }: ExpenseListProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <p className="text-[15px] text-gray-400">还没有记账记录</p>
        <p className="mt-1 text-[13px] text-gray-300">记一笔开始吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.dateKey}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-[13px] font-semibold text-gray-500">
              {group.label}
            </h3>
            <span className="text-[13px] tabular-nums text-gray-400">
              ¥{formatMoney(group.total)}
            </span>
          </div>
          <div className="space-y-2 rounded-2xl bg-white p-2 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
            {group.items.map((item) => (
              <ExpenseRow key={item.id} item={item} onDelete={onDelete} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
