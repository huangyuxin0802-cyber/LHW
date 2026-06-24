'use client';
import { useState } from 'react';

export default function Calculator() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 border rounded-lg shadow-md max-w-sm">
      <h2 className="text-xl font-semibold mb-4">简易计算器</h2>
      <div className="text-3xl font-bold mb-4">{count}</div>
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => setCount(count + 1)}>加一</button>
        <button className="px-4 py-2 bg-red-500 text-white rounded" onClick={() => setCount(count - 1)}>减一</button>
      </div>
    </div>
  );
}
