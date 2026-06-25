"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type TransactionType,
} from "@/types/expense";
import { ui } from "@/lib/ui";

type TransactionFormProps = {
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  onTypeChange: (type: TransactionType) => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
};

export default function TransactionForm({
  type,
  amount,
  category,
  description,
  onTypeChange,
  onAmountChange,
  onCategoryChange,
  onDescriptionChange,
  onSubmit,
}: TransactionFormProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const presetCategories = useMemo<string[]>(
    () => (type === "expense" ? [...EXPENSE_CATEGORIES] : [...INCOME_CATEGORIES]),
    [type]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false);
        setCustomMode(false);
        setCustomDraft("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTypeChange = (next: TransactionType) => {
    onTypeChange(next);
    const defaults =
      next === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0];
    onCategoryChange(defaults);
    setCategoryOpen(false);
    setCustomMode(false);
    setCustomDraft("");
  };

  const confirmCustomCategory = () => {
    const trimmed = customDraft.trim();
    if (!trimmed) {
      return;
    }
    onCategoryChange(trimmed);
    setCustomMode(false);
    setCustomDraft("");
    setCategoryOpen(false);
  };

  const isIncome = type === "income";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={`p-5 ${ui.cardInner} dark:bg-zinc-900/80`}
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            !isIncome
              ? "bg-red-500 text-white shadow-sm"
              : "text-zinc-500 hover:text-red-500 dark:text-zinc-400"
          }`}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={`rounded-lg py-2.5 text-sm font-semibold transition ${
            isIncome
              ? "bg-green-500 text-white shadow-sm"
              : "text-zinc-500 hover:text-green-500 dark:text-zinc-400"
          }`}
        >
          收入
        </button>
      </div>

      <div
        className={`flex items-end gap-1 border-b pb-3 transition focus-within:bg-zinc-100/80 dark:focus-within:bg-white/[0.04] ${ui.divider}`}
      >
        <span
          className={`pb-1 text-[32px] font-light ${
            isIncome ? "text-green-500" : "text-red-500"
          }`}
        >
          ¥
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(event) => {
            const val = event.target.value;
            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
              onAmountChange(val);
            }
          }}
          className={`w-full bg-transparent text-[40px] font-semibold tracking-tight outline-none placeholder:opacity-40 ${ui.textPrimary}`}
          aria-label="金额"
        />
      </div>

      <div className="relative mt-5" ref={panelRef}>
        <p className={`mb-2 ${ui.eyebrow}`}>分类</p>
        <button
          type="button"
          onClick={() => {
            setCategoryOpen((open) => !open);
            setCustomMode(false);
          }}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
            categoryOpen
              ? "border-zinc-300 bg-white ring-2 ring-zinc-900/5 dark:border-white/20 dark:bg-zinc-900 dark:ring-white/10"
              : ui.input
          }`}
        >
          <span className={ui.textPrimary}>{category || "选择分类"}</span>
          <span className={ui.label}>{categoryOpen ? "▲" : "▼"}</span>
        </button>

        {categoryOpen && (
          <div
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-xl shadow-black/10 ring-1 ring-black/[0.04] dark:border-white/15 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50 dark:ring-white/10"
          >
            {!customMode ? (
              <ul className="max-h-52 overflow-y-auto py-1">
                {presetCategories.map((item) => {
                  const selected = category === item;

                  return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => {
                        onCategoryChange(item);
                        setCategoryOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? isIncome
                            ? "bg-green-500/10 font-semibold text-green-600 dark:bg-green-500/15 dark:text-green-400"
                            : "bg-red-500/10 font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-400"
                          : `${ui.textPrimary} hover:bg-zinc-100 dark:hover:bg-zinc-800`
                      }`}
                    >
                      {item}
                    </button>
                  </li>
                  );
                })}
                {!presetCategories.includes(category) && category && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setCategoryOpen(false)}
                      className={`w-full px-3 py-2.5 text-left text-sm font-medium ${
                        isIncome
                          ? "bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400"
                          : "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                      }`}
                    >
                      {category}（自定义）
                    </button>
                  </li>
                )}
                <li className="border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMode(true);
                      setCustomDraft("");
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm font-medium text-violet-600 transition hover:bg-zinc-100 dark:text-violet-400 dark:hover:bg-zinc-800"
                  >
                    + 添加自定义分类
                  </button>
                </li>
              </ul>
            ) : (
              <div className="space-y-2 bg-white p-3 dark:bg-zinc-900">
                <input
                  type="text"
                  value={customDraft}
                  onChange={(event) => setCustomDraft(event.target.value)}
                  placeholder="输入新分类名称"
                  className={ui.input}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMode(false);
                      setCustomDraft("");
                    }}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm ${ui.btnSecondary}`}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={confirmCustomCategory}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-white ${
                      isIncome
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    确认
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        type="text"
        placeholder="备注（选填）"
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        className={`mt-4 ${ui.input}`}
      />

      <button
        type="submit"
        className={`mt-5 w-full !py-3.5 !text-[16px] font-semibold text-white ${
          isIncome
            ? "bg-green-500 hover:bg-green-600"
            : "bg-red-500 hover:bg-red-600"
        } rounded-xl transition`}
      >
        保存
      </button>
    </form>
  );
}
