"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import {
  updateUsernameClient,
  type ProfileActionState,
} from "@/lib/profile-client";
import { ui } from "@/lib/ui";

const initialState: ProfileActionState = {};

type NicknameEditorProps = {
  initialUsername: string;
  onUpdated?: (username: string) => void;
  compact?: boolean;
};

export default function NicknameEditor({
  initialUsername,
  onUpdated,
  compact = false,
}: NicknameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialUsername);
  const [state, setState] = useState<ProfileActionState>(initialState);
  const [isPending, startTransition] = useTransition();

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

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);

      startTransition(async () => {
        setState(await updateUsernameClient(formData));
      });
    },
    []
  );

  if (!editing) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "w-full"}`}>
        <span className={`text-[15px] font-medium ${ui.textPrimary}`}>
          {displayName}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`rounded-full p-1.5 transition ${ui.sidebarLink}`}
          aria-label="编辑昵称"
        >
          <Pencil size={14} />
        </button>
        {state.success && !editing && (
          <span className={`text-[12px] ${ui.success}`}>{state.success}</span>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        name="username"
        type="text"
        defaultValue={displayName}
        autoFocus
        maxLength={20}
        className={`min-w-0 flex-1 rounded-full px-4 py-2 text-[14px] ${ui.input}`}
        placeholder="输入新昵称"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={`inline-flex items-center gap-1 disabled:opacity-50 ${ui.btnPrimary}`}
        >
          <Check size={14} />
          保存
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className={`inline-flex items-center gap-1 ${ui.btnSecondary}`}
        >
          <X size={14} />
          取消
        </button>
      </div>
      {state.error && (
        <p className={`text-[13px] ${ui.error}`}>{state.error}</p>
      )}
    </form>
  );
}
