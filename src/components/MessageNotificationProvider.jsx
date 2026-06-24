"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AUTO_DISMISS_MS = 8000;
const MAX_TOASTS = 3;

function truncate(text, max = 48) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function getInitial(name) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function MessageToast({ toast, onClick, onDismiss }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="pointer-events-auto flex w-[320px] cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] animate-[messageToastIn_0.35s_ease-out]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#07c160] text-[18px] font-semibold text-white">
        {getInitial(toast.senderName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">
            {toast.senderName}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="shrink-0 rounded-full p-1 text-[#86868b] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
            aria-label="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-[#86868b]">
          {truncate(toast.content)}
        </p>
        <p className="mt-2 text-[12px] text-[#0071e3]">点击查看</p>
      </div>
    </div>
  );
}

export default function MessageNotificationProvider({ userId, children }) {
  const [toasts, setToasts] = useState([]);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const router = useRouter();
  const supabaseRef = useRef(null);
  const nameCacheRef = useRef(new Map());
  const timersRef = useRef(new Map());

  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const updateToastName = useCallback((id, senderName) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, senderName } : t))
    );
  }, []);

  const addToast = useCallback(
    (msg) => {
      const senderId = msg.sender_id;
      if (msg.recipient_id !== userId) return;
      if (senderId === userId) return;
      if (pathnameRef.current === `/chat/${senderId}`) return;

      const cachedName = nameCacheRef.current.get(senderId);
      const senderName = cachedName ?? `用户 ${senderId.slice(0, 8)}`;

      const toast = {
        id: msg.id,
        senderId,
        senderName,
        content: msg.content,
      };

      setToasts((prev) => {
        const withoutDup = prev.filter((t) => t.id !== toast.id);
        return [toast, ...withoutDup].slice(0, MAX_TOASTS);
      });

      const existingTimer = timersRef.current.get(msg.id);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => dismissToast(msg.id), AUTO_DISMISS_MS);
      timersRef.current.set(msg.id, timer);

      if (!cachedName) {
        void supabaseRef.current
          .from("profiles")
          .select("username")
          .eq("id", senderId)
          .maybeSingle()
          .then(({ data }) => {
            const name = data?.username ?? senderName;
            nameCacheRef.current.set(senderId, name);
            updateToastName(msg.id, name);
          });
      }
    },
    [dismissToast, updateToastName, userId]
  );

  useEffect(() => {
    if (!userId) return;

    const supabase = supabaseRef.current;
    let channel = null;
    let cancelled = false;

    async function subscribeInbox() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session) return;

      channel = supabase
        .channel(`inbox-notify-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            addToast(payload.new);
          }
        )
        .subscribe();
    }

    void subscribeInbox();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || cancelled) return;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      void subscribeInbox();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
      }
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, [userId, addToast]);

  const handleClick = (toast) => {
    dismissToast(toast.id);
    router.push(`/chat/${toast.senderId}`);
  };

  const toastLayer =
    mounted && toasts.length > 0
      ? createPortal(
          <div className="pointer-events-none fixed right-5 top-5 z-[9999] flex flex-col gap-3">
            {toasts.map((toast) => (
              <MessageToast
                key={toast.id}
                toast={toast}
                onClick={() => handleClick(toast)}
                onDismiss={() => dismissToast(toast.id)}
              />
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {children}
      {toastLayer}
    </>
  );
}
