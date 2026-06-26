"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import {
  addFriendByEmailClient,
  loadFriendsPageData,
  removeFriendClient,
  respondFriendRequestClient,
} from "@/lib/friends-client";
import { ui } from "@/lib/ui";

function formatTime(iso) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayLabel(profile, userId) {
  return profile?.username ?? `用户 ${userId.slice(0, 8)}`;
}

export default function FriendsPanel({ friends, incoming, outgoing, onRefresh }) {
  const [state, setState] = useState({});
  const [isPending, startTransition] = useTransition();

  const handleAddFriend = useCallback(
    (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);

      startTransition(async () => {
        const result = await addFriendByEmailClient(formData);
        setState(result);
        if (!result.error) {
          onRefresh?.();
        }
      });
    },
    [onRefresh]
  );

  const handleRespond = useCallback(
    (friendshipId, accept) => {
      startTransition(async () => {
        await respondFriendRequestClient(friendshipId, accept);
        onRefresh?.();
      });
    },
    [onRefresh]
  );

  const handleRemove = useCallback(
    (friendshipId) => {
      startTransition(async () => {
        await removeFriendClient(friendshipId);
        onRefresh?.();
      });
    },
    [onRefresh]
  );

  return (
    <div className="space-y-6">
      <section className={ui.card}>
        <h2 className={ui.title}>添加好友</h2>
        <p className={ui.subtitle}>输入对方注册时使用的邮箱</p>

        <form onSubmit={handleAddFriend} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            name="email"
            type="email"
            placeholder="friend@example.com"
            className={ui.input}
          />
          <button
            type="submit"
            disabled={isPending}
            className={`${ui.btnPrimary} shrink-0`}
          >
            {isPending ? "发送中…" : "添加"}
          </button>
        </form>

        {state.error && <p className={`mt-3 ${ui.error}`}>{state.error}</p>}
        {state.success && <p className={`mt-3 ${ui.success}`}>{state.success}</p>}
      </section>

      {incoming.length > 0 && (
        <section className={ui.card}>
          <h2 className={`text-[20px] font-semibold ${ui.textPrimary}`}>收到的好友请求</h2>
          <ul className="mt-4 space-y-3">
            {incoming.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-zinc-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
              >
                <div>
                  <p className={`font-medium ${ui.textPrimary}`}>
                    {displayLabel(req.profile, req.requesterId)}
                  </p>
                  <p className={ui.label}>{formatTime(req.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond(req.id, true)}
                    className={ui.btnPrimarySm}
                  >
                    接受
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(req.id, false)}
                    className={ui.btnGhost}
                  >
                    拒绝
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={ui.card}>
        <h2 className={`text-[20px] font-semibold ${ui.textPrimary}`}>我的好友</h2>
        {friends.length === 0 ? (
          <p className={`mt-4 ${ui.subtitle}`}>还没有好友，去添加吧</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {friends.map((friend) => (
              <li
                key={friend.friendshipId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-zinc-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
              >
                <p className={`font-medium ${ui.textPrimary}`}>
                  {displayLabel(friend.profile, friend.userId)}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/chat/${friend.userId}`}
                    className={ui.btnPrimarySm}
                  >
                    聊天
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemove(friend.friendshipId)}
                    className={ui.btnDanger}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className={ui.card}>
          <h2 className={`text-[20px] font-semibold ${ui.textPrimary}`}>待确认的请求</h2>
          <ul className="mt-4 space-y-3">
            {outgoing.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-zinc-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
              >
                <p className={`font-medium ${ui.textPrimary}`}>
                  {displayLabel(req.profile, req.addresseeId)}
                </p>
                <span className={ui.label}>等待确认</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
