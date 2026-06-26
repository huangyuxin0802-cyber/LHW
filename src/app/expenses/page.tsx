import { DashboardLayout } from "@/components/DashboardLayout";
import ExpenseApp from "@/components/expenses/ExpenseApp";

export default function ExpensesPage() {
  return (
    <DashboardLayout
      activeItem="expenses"
      title="记账本"
      description="记录收入与支出，支持自定义分类与统计图表。"
    >
      <ExpenseApp />
    </DashboardLayout>
  );
}
