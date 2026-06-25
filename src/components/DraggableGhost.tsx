"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Ghost, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CHAT_TRANSPORT = new DefaultChatTransport<UIMessage>({
  api: "/api/chat",
});

function MessageParts({
  parts,
}: {
  parts: UIMessage["parts"];
}) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <span key={`text-${index}`} className="whitespace-pre-wrap">
              {part.text}
            </span>
          );
        }

        if (part.type === "tool-schedule_message") {
          if (part.state !== "output-available") {
            return null;
          }

          const input =
            part.state === "output-available"
              ? (part.input as { recipient?: string })
              : null;

          const recipient =
            typeof part.output === "object" &&
            part.output !== null &&
            "recipient" in part.output
              ? String((part.output as { recipient: string }).recipient)
              : input?.recipient
                ? String(input.recipient)
                : null;

          if (!recipient) {
            return null;
          }

          return (
            <p
              key={`tool-${part.toolCallId}`}
              className="mt-1.5 text-xs text-violet-200/80"
            >
              📨 已安排发送给 {recipient}
            </p>
          );
        }

        return null;
      })}
    </>
  );
}

export default function DraggableGhost() {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: CHAT_TRANSPORT,
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    setMounted(true);
  }, []);

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }

    const text = error.message;
    if (text.includes("GROQ_API_KEY")) {
      return "Groq API Key 未配置。请在 Vercel 环境变量添加 GROQ_API_KEY。";
    }
    if (/rate limit|429|quota/i.test(text)) {
      return text.includes("Groq") ? text : "Groq API 请求过快，请稍后再试。";
    }
    if (/invalid.*api.*key|401|403|unauthorized/i.test(text)) {
      return "Groq API Key 无效。请到 console.groq.com 检查。";
    }

    return text || "小幽灵连接失败，请稍后再试。";
  }, [error]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      ref={constraintsRef}
      className="pointer-events-none fixed inset-0 z-[2147483646]"
      aria-live="polite"
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={constraintsRef}
        className="pointer-events-auto absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))]"
        onDragStart={() => {
          dragMovedRef.current = true;
        }}
        onDragEnd={() => {
          window.setTimeout(() => {
            dragMovedRef.current = false;
          }, 80);
        }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-2xl border border-violet-300/30 bg-zinc-950/95 shadow-2xl shadow-violet-950/50 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <p className="text-sm font-semibold text-violet-200">
                  小幽灵助手
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto px-3 py-3">
                {messages.length === 0 && !errorMessage && (
                  <p className="text-sm text-zinc-400">
                    哼，找我干嘛？问快点，我赶时间 👻
                  </p>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                        message.role === "user"
                          ? "bg-violet-600 text-white"
                          : "bg-white/10 text-zinc-100"
                      }`}
                    >
                      <MessageParts parts={message.parts} />
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <p className="text-xs text-zinc-500">小幽灵正在琢磨…</p>
                )}

                {errorMessage && (
                  <div className="rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs leading-relaxed text-red-200">
                    {errorMessage}
                    <button
                      type="button"
                      onClick={() => clearError()}
                      className="mt-2 block text-red-300 underline"
                    >
                      知道了
                    </button>
                  </div>
                )}
              </div>

              <form
                className="flex items-center gap-2 border-t border-white/10 p-2.5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = input.trim();
                  if (!text || isLoading) {
                    return;
                  }
                  clearError();
                  sendMessage({ text });
                  setInput("");
                }}
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="说点什么…"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-400/60"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40"
                  aria-label="发送"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => {
            if (dragMovedRef.current) {
              return;
            }
            setIsOpen((open) => !open);
          }}
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet-300/50 bg-violet-600 text-white shadow-xl shadow-violet-900/50 ring-4 ring-violet-500/25 transition hover:scale-105 hover:bg-violet-500 active:scale-95"
          aria-label={isOpen ? "关闭小幽灵助手" : "打开小幽灵助手"}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/20" />
          <Ghost className="relative h-8 w-8" />
        </motion.button>
      </motion.div>
    </div>,
    document.body
  );
}
