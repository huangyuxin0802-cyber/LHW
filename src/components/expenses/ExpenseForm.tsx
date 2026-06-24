"use client";

import { EXPENSE_CATEGORIES } from "@/types/expense";

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
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-5 shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-end gap-1 border-b border-gray-100 pb-3 transition focus-within:border-gray-200 focus-within:bg-gray-50/80">
        <span className="pb-1 text-[32px] font-light text-gray-400">¥</span>
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
          className="w-full bg-transparent text-[40px] font-semibold tracking-tight text-gray-900 outline-none placeholder:text-gray-300"
          aria-label="金额"
        />
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-gray-400">
          分类
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {EXPENSE_CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition ${
                  selected
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
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
        className="mt-4 w-full rounded-xl bg-gray-50 px-4 py-3 text-[15px] text-gray-800 outline-none placeholder:text-gray-400 focus:bg-gray-100"
      />

      <button
        type="submit"
        className="mt-5 w-full rounded-2xl bg-blue-600 py-3.5 text-[16px] font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99]"
      >
        记一笔
      </button>
    </form>
  );
}
