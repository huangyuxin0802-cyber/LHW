"use client";

import Link from "next/link";
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-[14px] text-gray-400">加载中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-[13px] text-gray-400 transition hover:text-gray-600"
        >
          ← 返回主页
        </Link>

        <header className="mb-6 text-center">
          <p className="text-[13px] font-medium uppercase tracking-wider text-gray-400">
            每日开销本
          </p>
          <p className="mt-2 text-[13px] text-gray-500">今日总支出</p>
          <p className="mt-1 text-[48px] font-bold tracking-tight text-gray-900">
            <span className="text-[28px] font-medium text-gray-400">¥</span>
            {formatMoney(todayTotal)}
          </p>
          <p className="mt-1 text-[12px] text-gray-400">
            {toDateKey(new Date())}
          </p>
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
    </div>
  );
}
