"use client";

import { useCallback, useState, useTransition } from "react";
import { createNoteClient, deleteNoteClient } from "@/lib/notes-client";
import { ui } from "@/lib/ui";

type Note = {
  id: string;
  content: string;
  created_at: string;
};

type NotesProps = {
  notes?: Note[];
  onNotesChange?: () => void | Promise<void>;
};

function formatNoteTime(isoString: string) {
  return new Date(isoString).toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Notes({ notes = [], onNotesChange }: NotesProps) {
  const [state, setState] = useState<{ error?: string }>({});
  const [isPending, startTransition] = useTransition();

  const handleCreate = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);

      startTransition(async () => {
        const result = await createNoteClient(formData);
        setState(result);
        if (!result.error) {
          form.reset();
          await onNotesChange?.();
        }
      });
    },
    [onNotesChange]
  );

  const handleDelete = useCallback(
    (noteId: string) => {
      startTransition(async () => {
        await deleteNoteClient(noteId);
        await onNotesChange?.();
      });
    },
    [onNotesChange]
  );

  return (
    <div className="space-y-6">
      <section className={ui.card}>
        <h2 className={ui.title}>写笔记</h2>
        <p className={ui.subtitle}>记录你的想法，保存后会显示撰写时间</p>

        <form onSubmit={handleCreate} className="mt-6 space-y-4">
          <textarea
            name="content"
            rows={5}
            placeholder="在这里输入笔记内容…"
            className={ui.textarea}
          />
          {state.error && (
            <p className={ui.error} role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className={ui.btnPrimary}
          >
            {isPending ? "保存中…" : "保存笔记"}
          </button>
        </form>
      </section>

      <section className={ui.card}>
        <h2 className={ui.title}>我的笔记</h2>
        <p className={ui.subtitle}>共 {notes.length} 条</p>

        {notes.length === 0 ? (
          <div className={`mt-8 ${ui.empty}`}>
            <p className="text-[17px]">还没有笔记</p>
            <p className="mt-1 text-[15px]">在上方写下第一条笔记吧</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {notes.map((note) => (
              <li key={note.id} className={ui.cardInner}>
                <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {note.content}
                </p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <time dateTime={note.created_at} className={ui.label}>
                    撰写于 {formatNoteTime(note.created_at)}
                  </time>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
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
    </div>
  );
}
