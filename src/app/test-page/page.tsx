'use client';
import Calculator from '@/components/Calculator';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">这是测试页面 (无任何校验)</h1>
      <div className="mt-6">
        <Calculator />
      </div>
    </div>
  );
}
