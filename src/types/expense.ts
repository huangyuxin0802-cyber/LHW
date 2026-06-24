export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export type ExpenseView = "list" | "stats";

export const EXPENSE_CATEGORIES = [
  "餐饮",
  "交通",
  "购物",
  "娱乐",
  "杂项",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const STORAGE_KEY = "lhw-expenses";
