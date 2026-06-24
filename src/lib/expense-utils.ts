import type { Expense, ExpenseCategory } from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function loadExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("lhw-expenses");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]) {
  localStorage.setItem("lhw-expenses", JSON.stringify(expenses));
}

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

export function formatDayLabel(dateKey: string) {
  const date = parseDateKey(dateKey);
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );

  const monthDay = date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });

  if (diff === 0) return `今天，${monthDay}`;
  if (diff === 1) return `昨天，${monthDay}`;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function sumByDate(expenses: Expense[], dateKey: string) {
  return expenses
    .filter((e) => e.date.startsWith(dateKey))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getTodayTotal(expenses: Expense[]) {
  return sumByDate(expenses, toDateKey(new Date()));
}

export type DayGroup = {
  dateKey: string;
  label: string;
  total: number;
  items: Expense[];
};

export function groupExpensesByDate(expenses: Expense[]): DayGroup[] {
  const map = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const key = expense.date.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(expense);
    map.set(key, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      total: items.reduce((sum, e) => sum + e.amount, 0),
      items: items.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
}

export function getLast7DaysTrend(expenses: Expense[]) {
  const today = startOfDay(new Date());
  const days: { dateKey: string; label: string; total: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = toDateKey(d);
    const label = d.toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
    });
    days.push({
      dateKey,
      label: i === 0 ? "今天" : label,
      total: sumByDate(expenses, dateKey),
    });
  }

  return days;
}

export type CategoryStat = {
  category: string;
  total: number;
  percent: number;
};

export function getCategoryStats(expenses: Expense[]): CategoryStat[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
  }

  const grand = [...totals.values()].reduce((s, v) => s + v, 0);
  if (grand === 0) return [];

  return [...totals.entries()]
    .map(([category, total]) => ({
      category,
      total,
      percent: Math.round((total / grand) * 100),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

export const CATEGORY_COLOR_MAP: Record<ExpenseCategory, string> = {
  餐饮: "#f97316",
  交通: "#3b82f6",
  购物: "#ec4899",
  娱乐: "#8b5cf6",
  杂项: "#14b8a6",
};

export const BAR_DAY_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#ef4444",
];

export function getCategoryColor(category: string) {
  if (isExpenseCategory(category)) {
    return CATEGORY_COLOR_MAP[category];
  }
  return "#71717a";
}

export function formatMoney(amount: number) {
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
