"use client";

import { useEffect, useMemo, useState } from "react";
import ExpenseCharts from "@/components/expenses/ExpenseCharts";
import ExpenseList from "@/components/expenses/ExpenseList";
import ViewToggle from "@/components/expenses/ViewToggle";
import TransactionForm from "@/components/expenses/TransactionForm";
import {
  formatMoney,
  getCategoryStats,
  getLast7DaysTrend,
  getTodaySummary,
  groupExpensesByDate,
  loadExpenses,
  saveExpenses,
  toDateKey,
} from "@/lib/expense-utils";
import { ui } from "@/lib/ui";
import type { ExpenseView, Transaction, TransactionType } from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";

export default function ExpenseApp() {
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ExpenseView>("list");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    setExpenses(loadExpenses());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveExpenses(expenses);
  }, [expenses, hydrated]);

  const todaySummary = useMemo(() => getTodaySummary(expenses), [expenses]);
  const groups = useMemo(() => groupExpensesByDate(expenses), [expenses]);
  const trend = useMemo(() => getLast7DaysTrend(expenses), [expenses]);
  const categoryStats = useMemo(() => getCategoryStats(expenses), [expenses]);

  const handleAdd = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type,
      amount: Math.round(parsed * 100) / 100,
      category,
      description: description.trim(),
      date: new Date().toISOString(),
    };

    setExpenses((prev) => [transaction, ...prev]);
    setAmount("");
    setDescription("");
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  if (!hydrated) {
    return <p className={`py-12 text-center ${ui.subtitle}`}>加载中…</p>;
  }

  const balancePositive = todaySummary.balance >= 0;

  return (
    <div className="mx-auto w-full max-w-md">
      <header className={`mb-6 rounded-2xl border p-6 text-center ${ui.cardInner}`}>
        <p className={ui.eyebrow}>今日结余</p>
        <p
          className={`mt-2 text-[48px] font-bold tracking-tight ${
            balancePositive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          <span className={`text-[28px] font-medium opacity-70`}>
            {balancePositive ? "+" : "-"}¥
          </span>
          {formatMoney(Math.abs(todaySummary.balance))}
        </p>
        <div className={`mt-3 flex justify-center gap-4 text-[12px] ${ui.label}`}>
          <span className="text-green-600 dark:text-green-400">
            收入 ¥{formatMoney(todaySummary.income)}
          </span>
          <span className="text-red-600 dark:text-red-400">
            支出 ¥{formatMoney(todaySummary.expense)}
          </span>
        </div>
        <p className={`mt-2 text-[12px] ${ui.label}`}>{toDateKey(new Date())}</p>
      </header>

      <ViewToggle view={view} onChange={setView} />

      <div className="mt-5 space-y-5">
        {view === "list" ? (
          <>
            <TransactionForm
              type={type}
              amount={amount}
              category={category}
              description={description}
              onTypeChange={setType}
              onAmountChange={setAmount}
              onCategoryChange={setCategory}
              onDescriptionChange={setDescription}
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
