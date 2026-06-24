"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CategoryIcon } from "@/components/expenses/CategoryIcon";
import {
  BAR_DAY_COLORS,
  formatMoney,
  getCategoryColor,
  type CategoryStat,
} from "@/lib/expense-utils";
import { ui } from "@/lib/ui";

type ExpenseChartsProps = {
  trend: { label: string; total: number }[];
  categories: CategoryStat[];
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload?: { category?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const category = payload[0].payload?.category;
  const color = category ? getCategoryColor(category) : BAR_DAY_COLORS[0];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="text-[12px] text-zinc-500">{category ?? label}</p>
      </div>
      <p className={`mt-1 text-[15px] font-semibold ${ui.textPrimary}`}>
        ¥{formatMoney(payload[0].value)}
      </p>
    </div>
  );
}

export default function ExpenseCharts({
  trend,
  categories,
}: ExpenseChartsProps) {
  const hasTrend = trend.some((d) => d.total > 0);
  const hasCategories = categories.length > 0;

  return (
    <div className="space-y-4">
      <section className={`p-5 ${ui.cardSm}`}>
        <h3 className={`text-[15px] font-semibold ${ui.textPrimary}`}>
          近 7 日趋势
        </h3>
        {!hasTrend ? (
          <p className={`mt-8 text-center text-[14px] ${ui.label}`}>
            暂无足够数据生成图表
          </p>
        ) : (
          <div className="mt-4 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="currentColor"
                  className="text-zinc-100 dark:text-white/10"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {trend.map((entry, index) => (
                    <Cell
                      key={entry.label}
                      fill={BAR_DAY_COLORS[index % BAR_DAY_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className={`p-5 ${ui.cardSm}`}>
        <h3 className={`text-[15px] font-semibold ${ui.textPrimary}`}>
          分类占比
        </h3>
        {!hasCategories ? (
          <p className={`mt-8 text-center text-[14px] ${ui.label}`}>
            暂无足够数据生成图表
          </p>
        ) : (
          <>
            <div className="mx-auto mt-2 h-52 w-full max-w-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categories.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={getCategoryColor(entry.category)}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-4 space-y-2.5">
              {categories.map((item) => {
                const color = getCategoryColor(item.category);
                return (
                  <li
                    key={item.category}
                    className="flex items-center justify-between text-[14px]"
                  >
                    <div className={`flex items-center gap-2.5 ${ui.body}`}>
                      <span
                        className="h-3 w-3 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <CategoryIcon
                        category={item.category}
                        size={15}
                        className="opacity-90"
                        style={{ color }}
                      />
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <span className={`tabular-nums font-medium ${ui.textPrimary}`}>
                      {item.percent}%
                      <span className={`ml-1 font-normal ${ui.label}`}>
                        · ¥{formatMoney(item.total)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
