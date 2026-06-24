"use client";

import { useEffect, useMemo, useState } from "react";
import ExpenseCharts from "@/components/expenses/ExpenseCharts";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseList from "@/components/expenses/ExpenseList";
import ViewToggle from "@/components/expenses/ViewToggle";
import {
  formatMoney,
  getCategoryStats,
  getLast7DaysTrend,
  getTodayTotal,
  groupExpensesByDate,
  loadExpenses,
  saveExpenses,
  toDateKey,
} from "@/lib/expense-utils";
import { ui } from "@/lib/ui";
import type { Expense, ExpenseView } from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";

export default function ExpenseApp() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ExpenseView>("list");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    setExpenses(loadExpenses());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveExpenses(expenses);
  }, [expenses, hydrated]);

  const todayTotal = useMemo(() => getTodayTotal(expenses), [expenses]);
  const groups = useMemo(() => groupExpensesByDate(expenses), [expenses]);
  const trend = useMemo(() => getLast7DaysTrend(expenses), [expenses]);
  const categoryStats = useMemo(() => getCategoryStats(expenses), [expenses]);

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: Math.round(parsed * 100) / 100,
      category,
      note: note.trim(),
      date: new Date().toISOString(),
    };

    setExpenses((prev) => [expense, ...prev]);
    setAmount("");
    setNote("");
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  if (!hydrated) {
    return <p className={`py-12 text-center ${ui.subtitle}`}>加载中…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <header className={`mb-6 rounded-2xl border p-6 text-center ${ui.cardInner}`}>
        <p className={ui.eyebrow}>今日总支出</p>
        <p className={`mt-2 text-[48px] font-bold tracking-tight ${ui.textPrimary}`}>
          <span className={`text-[28px] font-medium ${ui.label}`}>¥</span>
          {formatMoney(todayTotal)}
        </p>
        <p className={`mt-1 text-[12px] ${ui.label}`}>{toDateKey(new Date())}</p>
      </header>

      <ViewToggle view={view} onChange={setView} />

      <div className="mt-5 space-y-5">
        {view === "list" ? (
          <>
            <ExpenseForm
              amount={amount}
              category={category}
              note={note}
              onAmountChange={setAmount}
              onCategoryChange={setCategory}
              onNoteChange={setNote}
              onSubmit={handleAdd}
            />
            <ExpenseList groups={groups} onDelete={handleDelete} />
          </>
        ) : (
          <ExpenseCharts trend={trend} categories={categoryStats} />
        )}
      </div>
    </div>
  );
}
