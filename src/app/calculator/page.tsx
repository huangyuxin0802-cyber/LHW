import Calculator from "@/components/Calculator";
import { DashboardLayout } from "@/components/DashboardLayout";

export default async function CalculatorPage() {
  return (
    <DashboardLayout
      activeItem="calculator"
      title="计算器"
      description="支持加减乘除、小数与百分比。"
    >
      <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-12">
        <div className="flex justify-center">
          <Calculator />
        </div>
      </section>
    </DashboardLayout>
  );
}
