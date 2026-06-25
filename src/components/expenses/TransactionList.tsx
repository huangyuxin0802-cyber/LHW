"use client";

import type { Transaction } from "@/types/expense";
import { formatMoney } from "@/lib/expense-utils";
import { ui } from "@/lib/ui";

type TransactionListProps = {
  transactions: Transaction[];
};

export default function TransactionList({
  transactions,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className={`px-6 py-14 text-center ${ui.empty}`}>
        <p className="text-[15px]">还没有记账记录</p>
        <p className={`mt-1 text-[13px] ${ui.label}`}>记一笔开始吧</p>
      </div>
    );
  }

  return (
    <ul className={`space-y-2 p-2 ${ui.cardInner}`}>
      {transactions.map((item) => {
        const isIncome = item.type === "income";
        const title = item.description.trim() || item.category;

        return (
          <li
            key={item.id}
            className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${ui.listItem}`}
          >
            <div className="min-w-0 flex-1 pr-3">
              <p className={`truncate text-[15px] font-medium ${ui.textPrimary}`}>
                {title}
              </p>
              <span className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-400">
                {item.category}
              </span>
            </div>

            <span
              className={`shrink-0 text-[15px] font-semibold tabular-nums ${
                isIncome
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {isIncome ? "+" : "-"} ¥{formatMoney(item.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
