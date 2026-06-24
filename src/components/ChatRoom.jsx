"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction } from "@/app/actions/messages";

const initialState = {};

function formatTime(iso) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * @param {{
 *   currentUserId: string;
 *   friendId: string;
 *   friendName: string;
 *   initialMessages: Array<{ id: string; sender_id: string; recipient_id: string; content: string; created_at: string }>;
 * }} props
 */
export default function ChatRoom({
  currentUserId,
  friendId,
  friendName,
  initialMessages,
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, formAction, isPending] = useActionState(
    sendMessageAction,
    initialState
  );
  const bottomRef = useRef(null);
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${currentUserId}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new;
          const isRelevant =
            (msg.sender_id === currentUserId && msg.recipient_id === friendId) ||
            (msg.sender_id === friendId && msg.recipient_id === currentUserId);
          if (!isRelevant) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, friendId]);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-[24px] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)]">
      <div className="border-b border-black/[0.06] px-6 py-4">
        <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
          与 {friendName} 的对话
        </h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-[15px] text-[#86868b]">
            还没有消息，发送第一条吧
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-[#0071e3] text-white"
                      : "bg-[#f5f5f7] text-[#1d1d1f]"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {msg.content}
                  </p>
                  <p
                    className={`mt-1 text-[11px] ${
                      isMine ? "text-white/70" : "text-[#86868b]"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        action={formAction}
        className="flex gap-3 border-t border-black/[0.06] px-6 py-4"
      >
        <input type="hidden" name="recipientId" value={friendId} />
        <input
          name="content"
          type="text"
          placeholder="输入消息…"
          autoComplete="off"
          className="flex-1 rounded-full bg-[#f5f5f7] px-4 py-3 text-[15px] outline-none focus:bg-[#ebebed] focus:ring-2 focus:ring-[#0071e3]/30"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[#0071e3] px-5 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] disabled:opacity-50"
        >
          发送
        </button>
      </form>
      {state.error && (
        <p className="px-6 pb-4 text-[14px] text-[#ff3b30]">{state.error}</p>
      )}
    </div>
  );
}
