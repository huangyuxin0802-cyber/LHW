import { DashboardLayout } from "@/components/DashboardLayout";
import ExpenseApp from "@/components/expenses/ExpenseApp";

export default async function ExpensesPage() {
  return (
    <DashboardLayout
      activeItem="expenses"
      title="开销本"
      description="记录每日支出，查看统计图表。"
    >
      <ExpenseApp />
    </DashboardLayout>
  );
}
