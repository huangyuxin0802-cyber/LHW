import type {
  Expense,
  ExpenseCategory,
  Transaction,
  TransactionType,
} from "@/types/expense";
import { EXPENSE_CATEGORIES } from "@/types/expense";

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function loadExpenses(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("lhw-expenses");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      Transaction & { note?: string; type?: TransactionType }
    >;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: item.id,
      type: item.type === "income" ? "income" : "expense",
      amount: item.amount,
      category: item.category,
      description: item.description ?? item.note ?? "",
      date: item.date,
    }));
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Transaction[]) {
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

export function sumByDate(expenses: Transaction[], dateKey: string) {
  return expenses
    .filter((e) => e.date.startsWith(dateKey))
    .reduce((sum, e) => sum + signedAmount(e), 0);
}

export function signedAmount(transaction: Transaction) {
  return transaction.type === "income" ? transaction.amount : -transaction.amount;
}

export function getTodayTotal(expenses: Transaction[]) {
  return sumByDate(expenses, toDateKey(new Date()));
}

export function getTodaySummary(expenses: Transaction[]) {
  const todayKey = toDateKey(new Date());
  const today = expenses.filter((e) => e.date.startsWith(todayKey));
  const income = today
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const expense = today
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  return { income, expense, balance: income - expense };
}

export type DayGroup = {
  dateKey: string;
  label: string;
  total: number;
  items: Transaction[];
};

export function groupExpensesByDate(expenses: Transaction[]): DayGroup[] {
  const map = new Map<string, Transaction[]>();

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
      total: items.reduce((sum, e) => sum + signedAmount(e), 0),
      items: items.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));
}

export function getLast7DaysTrend(expenses: Transaction[]) {
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
    const expenseTotal = expenses
      .filter(
        (e) => e.date.startsWith(dateKey) && e.type === "expense"
      )
      .reduce((sum, e) => sum + e.amount, 0);
    days.push({
      dateKey,
      label: i === 0 ? "今天" : label,
      total: expenseTotal,
    });
  }

  return days;
}

export type CategoryStat = {
  category: string;
  total: number;
  percent: number;
};

export function getCategoryStats(expenses: Transaction[]): CategoryStat[] {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.type !== "expense") continue;
    totals.set(
      expense.category,
      (totals.get(expense.category) ?? 0) + expense.amount
    );
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

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  餐饮: "#f97316",
  交通: "#3b82f6",
  购物: "#ec4899",
  娱乐: "#8b5cf6",
  杂项: "#14b8a6",
  工资: "#22c55e",
  理财: "#10b981",
  兼职: "#84cc16",
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
  return CATEGORY_COLOR_MAP[category] ?? "#71717a";
}

export function formatMoney(amount: number) {
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
