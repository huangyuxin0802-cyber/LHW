"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  addFriendByEmailAction,
  acceptFriendFormAction,
  rejectFriendFormAction,
  removeFriendFormAction,
} from "@/app/actions/friends";

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
      <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-10">
        <h2 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">
          添加好友
        </h2>
        <p className="mt-1 text-[15px] text-[#86868b]">
          输入对方注册时使用的邮箱
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            name="email"
            type="email"
            placeholder="friend@example.com"
            className="flex-1 rounded-xl bg-[#f5f5f7] px-4 py-3.5 text-[17px] outline-none focus:bg-[#ebebed] focus:ring-2 focus:ring-[#0071e3]/30"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[#0071e3] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#0077ed] disabled:opacity-50"
          >
            {isPending ? "发送中…" : "添加"}
          </button>
        </form>

        {state.error && (
          <p className="mt-3 text-[15px] text-[#ff3b30]">{state.error}</p>
        )}
        {state.success && (
          <p className="mt-3 text-[15px] text-[#248a3d]">{state.success}</p>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-10">
          <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
            收到的好友请求
          </h2>
          <ul className="mt-4 space-y-3">
            {incoming.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4"
              >
                <div>
                  <p className="font-medium text-[#1d1d1f]">
                    {displayLabel(req.profile, req.requesterId)}
                  </p>
                  <p className="text-[13px] text-[#86868b]">
                    {formatTime(req.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={acceptFriendFormAction}>
                    <input type="hidden" name="friendshipId" value={req.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-[#0071e3] px-4 py-1.5 text-[13px] font-medium text-white"
                    >
                      接受
                    </button>
                  </form>
                  <form action={rejectFriendFormAction}>
                    <input type="hidden" name="friendshipId" value={req.id} />
                    <button
                      type="submit"
                      className="rounded-full px-4 py-1.5 text-[13px] font-medium text-[#86868b] hover:bg-black/[0.04]"
                    >
                      拒绝
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-10">
        <h2 className="text-[20px] font-semibold text-[#1d1d1f]">我的好友</h2>
        {friends.length === 0 ? (
          <p className="mt-4 text-[15px] text-[#86868b]">还没有好友，去添加吧</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {friends.map((friend) => (
              <li
                key={friend.friendshipId}
                className="flex items-center justify-between gap-4 rounded-2xl bg-[#f5f5f7] p-4"
              >
                <p className="font-medium text-[#1d1d1f]">
                  {displayLabel(friend.profile, friend.userId)}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/chat/${friend.userId}`}
                    className="rounded-full bg-[#0071e3] px-4 py-1.5 text-[13px] font-medium text-white hover:bg-[#0077ed]"
                  >
                    聊天
                  </Link>
                  <form action={removeFriendFormAction}>
                    <input
                      type="hidden"
                      name="friendshipId"
                      value={friend.friendshipId}
                    />
                    <button
                      type="submit"
                      className="rounded-full px-4 py-1.5 text-[13px] font-medium text-[#ff3b30] hover:bg-[#fff2f1]"
                    >
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
        <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-10">
          <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
            待确认的请求
          </h2>
          <ul className="mt-4 space-y-3">
            {outgoing.map((req) => (
              <li
                key={req.id}
                className="flex items-center justify-between rounded-2xl bg-[#f5f5f7] p-4"
              >
                <p className="font-medium text-[#1d1d1f]">
                  {displayLabel(req.profile, req.addresseeId)}
                </p>
                <span className="text-[13px] text-[#86868b]">等待确认</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
