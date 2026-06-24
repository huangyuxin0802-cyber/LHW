"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  addFriendByEmailAction,
  acceptFriendFormAction,
  rejectFriendFormAction,
  removeFriendFormAction,
} from "@/app/actions/friends";
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

function displayLabel(profile, userId) {
  return profile?.username ?? `用户 ${userId.slice(0, 8)}`;
}

/**
 * @param {{
 *   friends: Array<{ friendshipId: string; userId: string; profile: { username?: string } | null }>;
 *   incoming: Array<{ id: string; requesterId: string; profile: { username?: string } | null; created_at: string }>;
 *   outgoing: Array<{ id: string; addresseeId: string; profile: { username?: string } | null; created_at: string }>;
 * }} props
 */
export default function FriendsPanel({ friends, incoming, outgoing }) {
  const [state, formAction, isPending] = useActionState(
    addFriendByEmailAction,
    initialState
  );

  return (
    <div className="space-y-6">
      <section className={ui.card}>
        <h2 className={ui.title}>添加好友</h2>
        <p className={ui.subtitle}>输入对方注册时使用的邮箱</p>

        <form action={formAction} className="mt-6 flex flex-col gap-3 sm:flex-row">
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
          <h2 className="text-[20px] font-semibold text-white">收到的好友请求</h2>
          <ul className="mt-4 space-y-3">
            {incoming.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div>
                  <p className="font-medium text-zinc-100">
                    {displayLabel(req.profile, req.requesterId)}
                  </p>
                  <p className={ui.label}>{formatTime(req.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <form action={acceptFriendFormAction}>
                    <input type="hidden" name="friendshipId" value={req.id} />
                    <button type="submit" className={ui.btnPrimarySm}>
                      接受
                    </button>
                  </form>
                  <form action={rejectFriendFormAction}>
                    <input type="hidden" name="friendshipId" value={req.id} />
                    <button type="submit" className={ui.btnGhost}>
                      拒绝
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={ui.card}>
        <h2 className="text-[20px] font-semibold text-white">我的好友</h2>
        {friends.length === 0 ? (
          <p className={`mt-4 ${ui.subtitle}`}>还没有好友，去添加吧</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {friends.map((friend) => (
              <li
                key={friend.friendshipId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="font-medium text-zinc-100">
                  {displayLabel(friend.profile, friend.userId)}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/chat/${friend.userId}`}
                    className={ui.btnPrimarySm}
                  >
                    聊天
                  </Link>
                  <form action={removeFriendFormAction}>
                    <input
                      type="hidden"
                      name="friendshipId"
                      value={friend.friendshipId}
                    />
                    <button type="submit" className={ui.btnDanger}>
                      删除
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className={ui.card}>
          <h2 className="text-[20px] font-semibold text-white">待确认的请求</h2>
          <ul className="mt-4 space-y-3">
            {outgoing.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="font-medium text-zinc-100">
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
