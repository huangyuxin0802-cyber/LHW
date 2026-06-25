"use client";

import type { UIMessage } from "ai";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

function getMessageText(parts: UIMessage["parts"]) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

type AssistantMessageBubbleProps = {
  parts: UIMessage["parts"];
  className?: string;
};

export default function AssistantMessageBubble({
  parts,
  className = "",
}: AssistantMessageBubbleProps) {
  const text = getMessageText(parts);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("copy failed:", error);
    }
  }, [text]);

  return (
    <div className={`group relative pr-7 ${className}`}>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!text}
        className="absolute bottom-1 right-1 rounded-md p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100 disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-zinc-200"
        aria-label="复制回复"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {text}
    </div>
  );
}
