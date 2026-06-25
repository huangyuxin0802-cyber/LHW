"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import { Ghost, Send } from "lucide-react";
import { useRef, useState } from "react";

function MessageParts({
  parts,
}: {
  parts: ReturnType<typeof useChat>["messages"][number]["parts"];
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
          const input =
            part.state === "input-available" || part.state === "output-available"
              ? (part.input as { recipient?: string })
              : null;

          const recipient =
            part.state === "output-available" &&
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
              className="mt-1 text-xs text-violet-200/90"
            >
              👻 已安排将消息发送给 {recipient}
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
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div
      ref={constraintsRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
    >
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.12}
        dragConstraints={constraintsRef}
        className="pointer-events-auto absolute bottom-6 right-6 touch-none"
        whileDrag={{ scale: 1.05 }}
      >
        {isOpen && (
          <div className="absolute bottom-[calc(100%+0.75rem)] right-0 w-[min(calc(100vw-2rem),20rem)] overflow-hidden rounded-2xl border border-white/20 bg-zinc-900/75 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="text-xs font-medium text-violet-200">小幽灵助手</p>
            </div>

            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto px-3 py-3">
              {messages.length === 0 && (
                <p className="text-xs text-zinc-400">
                  哼，找我干嘛？问快点，我赶时间 👻
                </p>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
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
            </div>

            <form
              className="flex items-center gap-2 border-t border-white/10 p-2"
              onSubmit={(event) => {
                event.preventDefault();
                const text = input.trim();
                if (!text || isLoading) {
                  return;
                }
                sendMessage({ text });
                setInput("");
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="说点什么…"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-400/50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40"
                aria-label="发送"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        <motion.button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-violet-600/90 text-white shadow-lg shadow-violet-900/40 backdrop-blur-sm transition hover:bg-violet-500"
          aria-label={isOpen ? "关闭小幽灵助手" : "打开小幽灵助手"}
        >
          <Ghost className="h-7 w-7" />
        </motion.button>
      </motion.div>
    </div>
  );
}
