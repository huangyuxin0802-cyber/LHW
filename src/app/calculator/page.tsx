import Calculator from "@/components/Calculator";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ui } from "@/lib/ui";

export default function CalculatorPage() {
  return (
    <DashboardLayout
      activeItem="calculator"
      title="计算器"
      description="支持加减乘除、小数与百分比。"
    >
      <section className={ui.card}>
        <div className="flex justify-center py-4">
          <Calculator />
        </div>
      </section>
    </DashboardLayout>
  );
}
