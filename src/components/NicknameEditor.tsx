"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import {
  updateUsernameAction,
  type ProfileActionState,
} from "@/app/actions/profile";

const initialState: ProfileActionState = {};

type NicknameEditorProps = {
  initialUsername: string;
  onUpdated?: (username: string) => void;
  variant?: "light" | "dark";
  compact?: boolean;
};

export default function NicknameEditor({
  initialUsername,
  onUpdated,
  variant = "dark",
  compact = false,
}: NicknameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialUsername);
  const [state, formAction, isPending] = useActionState(
    updateUsernameAction,
    initialState
  );

  useEffect(() => {
    setDisplayName(initialUsername);
  }, [initialUsername]);

  useEffect(() => {
    if (state.success && state.username) {
      setDisplayName(state.username);
      setEditing(false);
      onUpdated?.(state.username);
    }
  }, [state.success, state.username, onUpdated]);

  const isDark = variant === "dark";

  if (!editing) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}>
        <span
          className={
            isDark
              ? "text-[15px] font-medium text-zinc-100"
              : "text-[15px] font-medium text-[#1d1d1f]"
          }
        >
          {displayName}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`rounded-full p-1.5 transition ${
            isDark
              ? "text-zinc-400 hover:bg-white/10 hover:text-white"
              : "text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          }`}
          aria-label="编辑昵称"
        >
          <Pencil size={14} />
        </button>
        {state.success && !editing && (
          <span className="text-[12px] text-emerald-400">{state.success}</span>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      <input
        name="username"
        type="text"
        defaultValue={displayName}
        autoFocus
        maxLength={20}
        className={`min-w-0 flex-1 rounded-full px-4 py-2 text-[14px] outline-none ${
          isDark
            ? "border border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-500 focus:border-white/20 focus:ring-2 focus:ring-white/10"
            : "bg-[#f5f5f7] text-[#1d1d1f] focus:ring-2 focus:ring-[#0071e3]/30"
        }`}
        placeholder="输入新昵称"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-medium transition disabled:opacity-50 ${
            isDark
              ? "bg-white text-zinc-950 hover:bg-zinc-200"
              : "bg-[#0071e3] text-white hover:bg-[#0077ed]"
          }`}
        >
          <Check size={14} />
          保存
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
          }}
          className={`inline-flex items-center gap-1 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
            isDark
              ? "border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
              : "border-black/[0.08] text-[#1d1d1f] hover:bg-[#f5f5f7]"
          }`}
        >
          <X size={14} />
          取消
        </button>
      </div>
      {state.error && (
        <p className={`text-[13px] ${isDark ? "text-red-400" : "text-[#ff3b30]"}`}>
          {state.error}
        </p>
      )}
    </form>
  );
}
