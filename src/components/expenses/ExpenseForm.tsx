"use client";

import { EXPENSE_CATEGORIES } from "@/types/expense";
import { getCategoryColor } from "@/lib/expense-utils";
import { ui } from "@/lib/ui";

type ExpenseFormProps = {
  amount: string;
  category: string;
  note: string;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
};

export default function ExpenseForm({
  amount,
  category,
  note,
  onAmountChange,
  onCategoryChange,
  onNoteChange,
  onSubmit,
}: ExpenseFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={`p-5 ${ui.cardInner}`}>
      <div
        className={`flex items-end gap-1 border-b pb-3 transition focus-within:bg-zinc-100/80 dark:focus-within:bg-white/[0.04] ${ui.divider}`}
      >
        <span className={`pb-1 text-[32px] font-light ${ui.label}`}>¥</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
              onAmountChange(val);
            }
          }}
          className={`w-full bg-transparent text-[40px] font-semibold tracking-tight outline-none placeholder:opacity-40 ${ui.textPrimary}`}
          aria-label="金额"
        />
      </div>

      <div className="mt-5">
        <p className={`mb-2 ${ui.eyebrow}`}>分类</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {EXPENSE_CATEGORIES.map((cat) => {
            const selected = category === cat;
            const color = getCategoryColor(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition ${
                  selected
                    ? "text-white shadow-md"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15"
                }`}
                style={selected ? { backgroundColor: color } : undefined}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <input
        type="text"
        placeholder="备注（选填）"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        className={`mt-4 ${ui.input}`}
      />

      <button
        type="submit"
        className={`mt-5 w-full !py-3.5 !text-[16px] font-semibold ${ui.btnPrimary}`}
      >
        记一笔
      </button>
    </form>
  );
}
