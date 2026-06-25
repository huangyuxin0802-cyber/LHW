export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

/** @deprecated Use Transaction */
export type Expense = Transaction;

export type ExpenseView = "list" | "stats";

export const EXPENSE_CATEGORIES = [
  "餐饮",
  "交通",
  "购物",
  "娱乐",
  "杂项",
] as const;

export const INCOME_CATEGORIES = ["工资", "理财", "兼职"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export const STORAGE_KEY = "lhw-expenses";
