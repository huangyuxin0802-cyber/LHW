"use client";

import { useCallback, useState } from "react";

type Operator = "+" | "-" | "×" | "÷";

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = useCallback(
    (digit: string) => {
      setDisplay((prev) => {
        if (waitingForOperand) {
          setWaitingForOperand(false);
          return digit;
        }
        if (prev === "0") return digit;
        if (prev.length >= 12) return prev;
        return prev + digit;
      });
    },
    [waitingForOperand]
  );

  const inputDot = useCallback(() => {
    setDisplay((prev) => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return "0.";
      }
      return prev.includes(".") ? prev : prev + ".";
    });
  }, [waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay("0");
    setStored(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const performCalc = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? NaN : a / b;
    }
  };

  const handleOperator = useCallback(
    (nextOp: Operator) => {
      const current = parseFloat(display);
      if (stored !== null && operator && !waitingForOperand) {
        const result = performCalc(stored, current, operator);
        const formatted = Number.isFinite(result)
          ? String(parseFloat(result.toPrecision(12)))
          : "Error";
        setDisplay(formatted);
        setStored(Number.isFinite(result) ? result : null);
      } else {
        setStored(current);
      }
      setOperator(nextOp);
      setWaitingForOperand(true);
    },
    [display, stored, operator, waitingForOperand]
  );

  const handleEquals = useCallback(() => {
    if (stored === null || !operator) return;
    const current = parseFloat(display);
    const result = performCalc(stored, current, operator);
    const formatted = Number.isFinite(result)
      ? String(parseFloat(result.toPrecision(12)))
      : "Error";
    setDisplay(formatted);
    setStored(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, stored, operator]);

  const handlePercent = useCallback(() => {
    setDisplay(String(parseFloat(display) / 100));
  }, [display]);

  const handleToggleSign = useCallback(() => {
    setDisplay((prev) =>
      prev === "0" ? prev : String(parseFloat(prev) * -1)
    );
  }, []);

  const btn =
    "flex h-[72px] items-center justify-center rounded-full text-[28px] font-normal transition active:scale-[0.96]";
  const num = `${btn} bg-[#333333] text-white hover:bg-[#4d4d4d]`;
  const fn = `${btn} bg-[#a5a5a5] text-black hover:bg-[#bfbfbf]`;
  const op = `${btn} bg-[#ff9f0a] text-white hover:bg-[#ffb340]`;

  return (
    <div className="w-full max-w-[320px] rounded-[28px] bg-black p-4">
      <div className="mb-4 px-2 py-6 text-right">
        {operator && stored !== null && (
          <p className="text-[15px] text-[#86868b]">
            {stored} {operator}
          </p>
        )}
        <p className="truncate text-[64px] font-light leading-none tracking-tight text-white">
          {display}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <button type="button" className={fn} onClick={clear}>
          AC
        </button>
        <button type="button" className={fn} onClick={handleToggleSign}>
          ±
        </button>
        <button type="button" className={fn} onClick={handlePercent}>
          %
        </button>
        <button type="button" className={op} onClick={() => handleOperator("÷")}>
          ÷
        </button>

        {["7", "8", "9"].map((d) => (
          <button key={d} type="button" className={num} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={op} onClick={() => handleOperator("×")}>
          ×
        </button>

        {["4", "5", "6"].map((d) => (
          <button key={d} type="button" className={num} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={op} onClick={() => handleOperator("-")}>
          −
        </button>

        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" className={num} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={op} onClick={() => handleOperator("+")}>
          +
        </button>

        <button type="button" className={`${num} col-span-2 !justify-start pl-7`} onClick={() => inputDigit("0")}>
          0
        </button>
        <button type="button" className={num} onClick={inputDot}>
          .
        </button>
        <button type="button" className={op} onClick={handleEquals}>
          =
        </button>
      </div>
    </div>
  );
}
