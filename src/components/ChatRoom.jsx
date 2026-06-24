"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessageAction } from "@/app/actions/messages";
import NicknameEditor from "@/components/NicknameEditor";
import { ui } from "@/lib/ui";

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
 *   currentUsername: string;
 *   friendId: string;
 *   friendName: string;
 *   initialMessages: Array<{ id: string; sender_id: string; recipient_id: string; content: string; created_at: string }>;
 * }} props
 */
export default function ChatRoom({
  currentUserId,
  currentUsername,
  friendId,
  friendName,
  initialMessages,
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [myName, setMyName] = useState(currentUsername);
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
    setMyName(currentUsername);
  }, [currentUsername]);

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
    <div className={`flex h-[calc(100vh-12rem)] flex-col ${ui.card} !p-0`}>
      <div className={`border-b px-6 py-4 ${ui.divider}`}>
        <h2 className={`text-[20px] font-semibold ${ui.textPrimary}`}>
          与 {friendName} 的对话
        </h2>
        <div className={`mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 ${ui.cardInner}`}>
          <span className={ui.label}>我的昵称</span>
          <NicknameEditor
            initialUsername={myName}
            onUpdated={setMyName}
            compact
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <p className={`text-center ${ui.subtitle}`}>
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
                    isMine ? ui.chatMine : ui.chatTheirs
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {msg.content}
                  </p>
                  <p
                    className={`mt-1 text-[11px] ${
                      isMine ? "text-zinc-500" : "text-zinc-500"
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
        className={`flex gap-3 border-t px-6 py-4 ${ui.divider}`}
      >
        <input type="hidden" name="recipientId" value={friendId} />
        <input
          name="content"
          type="text"
          placeholder="输入消息…"
          autoComplete="off"
          className={ui.inputSm}
        />
        <button
          type="submit"
          disabled={isPending}
          className={`${ui.btnPrimary} !rounded-full !px-5 !py-3`}
        >
          发送
        </button>
      </form>
      {state.error && (
        <p className={`px-6 pb-4 ${ui.error}`}>{state.error}</p>
      )}
    </div>
  );
}
