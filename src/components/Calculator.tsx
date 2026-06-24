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

  const btnClass =
    "flex h-14 items-center justify-center rounded-xl text-lg font-medium transition active:scale-95";
  const numClass = `${btnClass} bg-zinc-100 text-zinc-900 hover:bg-zinc-200`;
  const opClass = `${btnClass} bg-indigo-100 text-indigo-700 hover:bg-indigo-200`;
  const actionClass = `${btnClass} bg-zinc-200 text-zinc-700 hover:bg-zinc-300`;

  return (
    <div className="mx-auto w-full max-w-xs rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-inner">
      <div className="mb-4 rounded-xl bg-zinc-900 px-4 py-5 text-right">
        {operator && stored !== null && (
          <p className="text-xs text-zinc-400">
            {stored} {operator}
          </p>
        )}
        <p className="truncate text-3xl font-semibold tabular-nums text-white">
          {display}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button type="button" className={actionClass} onClick={clear}>
          AC
        </button>
        <button type="button" className={actionClass} onClick={handleToggleSign}>
          ±
        </button>
        <button type="button" className={actionClass} onClick={handlePercent}>
          %
        </button>
        <button type="button" className={opClass} onClick={() => handleOperator("÷")}>
          ÷
        </button>

        {["7", "8", "9"].map((d) => (
          <button key={d} type="button" className={numClass} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={opClass} onClick={() => handleOperator("×")}>
          ×
        </button>

        {["4", "5", "6"].map((d) => (
          <button key={d} type="button" className={numClass} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={opClass} onClick={() => handleOperator("-")}>
          −
        </button>

        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" className={numClass} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={opClass} onClick={() => handleOperator("+")}>
          +
        </button>

        <button type="button" className={`${numClass} col-span-2`} onClick={() => inputDigit("0")}>
          0
        </button>
        <button type="button" className={numClass} onClick={inputDot}>
          .
        </button>
        <button
          type="button"
          className={`${btnClass} bg-indigo-600 text-white hover:bg-indigo-500`}
          onClick={handleEquals}
        >
          =
        </button>
      </div>
    </div>
  );
}
