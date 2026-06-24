"use client";

import { useActionState } from "react";
import {
  createNoteAction,
  deleteNoteFormAction,
} from "@/app/actions/notes";

const initialState = {};

function formatNoteTime(isoString) {
  return new Date(isoString).toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * @param {{ notes?: { id: string; content: string; created_at: string }[] }} props
 */
export default function Notes({ notes = [] }) {
  const [state, formAction, isPending] = useActionState(
    createNoteAction,
    initialState
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-10">
        <h2 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">
          写笔记
        </h2>
        <p className="mt-1 text-[15px] text-[#86868b]">
          记录你的想法，保存后会显示撰写时间
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <textarea
            name="content"
            rows={5}
            placeholder="在这里输入笔记内容…"
            className="w-full resize-none rounded-2xl bg-[#f5f5f7] px-4 py-3.5 text-[17px] leading-relaxed text-[#1d1d1f] outline-none transition placeholder:text-[#86868b] focus:bg-[#ebebed] focus:ring-2 focus:ring-[#0071e3]/30"
          />
          {state.error && (
            <p className="text-[15px] text-[#ff3b30]" role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[#0071e3] px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "保存中…" : "保存笔记"}
          </button>
        </form>
      </section>

      <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-10">
        <h2 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">
          我的笔记
        </h2>
        <p className="mt-1 text-[15px] text-[#86868b]">
          共 {notes.length} 条
        </p>

        {notes.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-[#f5f5f7] px-6 py-12 text-center">
            <p className="text-[17px] text-[#86868b]">还没有笔记</p>
            <p className="mt-1 text-[15px] text-[#86868b]">
              在上方写下第一条笔记吧
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-5"
              >
                <p className="whitespace-pre-wrap text-[17px] leading-relaxed text-[#1d1d1f]">
                  {note.content}
                </p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <time
                    dateTime={note.created_at}
                    className="text-[13px] text-[#86868b]"
                  >
                    撰写于 {formatNoteTime(note.created_at)}
                  </time>
                  <form action={deleteNoteFormAction}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <button
                      type="submit"
                      className="text-[13px] font-medium text-[#ff3b30] transition hover:text-[#ff453a]"
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
    </div>
  );
}
