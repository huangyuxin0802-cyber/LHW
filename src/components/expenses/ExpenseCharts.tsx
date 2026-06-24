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
  CATEGORY_COLORS,
  formatMoney,
  type CategoryStat,
} from "@/lib/expense-utils";

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
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <p className="text-[12px] text-gray-400">{label}</p>
      <p className="text-[15px] font-semibold text-gray-900">
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
      <section className="rounded-2xl bg-white p-5 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <h3 className="text-[15px] font-semibold text-gray-900">近 7 日趋势</h3>
        {!hasTrend ? (
          <p className="mt-8 text-center text-[14px] text-gray-400">
            暂无足够数据生成图表
          </p>
        ) : (
          <div className="mt-4 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  stroke="#f3f4f6"
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
                <Bar
                  dataKey="total"
                  fill="#171717"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <h3 className="text-[15px] font-semibold text-gray-900">分类占比</h3>
        {!hasCategories ? (
          <p className="mt-8 text-center text-[14px] text-gray-400">
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
                    paddingAngle={2}
                    stroke="none"
                  >
                    {categories.map((entry, index) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="mt-4 space-y-2.5">
              {categories.map((item, index) => (
                <li
                  key={item.category}
                  className="flex items-center justify-between text-[14px]"
                >
                  <div className="flex items-center gap-2.5 text-gray-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      }}
                    />
                    <CategoryIcon category={item.category} size={15} />
                    <span>{item.category}</span>
                  </div>
                  <span className="tabular-nums text-gray-500">
                    {item.percent}% · ¥{formatMoney(item.total)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
