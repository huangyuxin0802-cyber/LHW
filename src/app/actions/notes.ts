"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type NoteActionState = {
  error?: string;
};

export async function createNoteAction(
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "笔记内容不能为空" };
  }

  if (content.length > 5000) {
    return { error: "笔记内容不能超过 5000 字" };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { error: "请先登录" };
  }

  const { error } = await supabase.from("notes").insert({
    user_id: userId,
    content,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notes");
  return {};
}

async function deleteNoteAction(noteId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/notes");
  return {};
}

export async function deleteNoteFormAction(formData: FormData) {
  const noteId = String(formData.get("noteId") ?? "");
  if (!noteId) return { error: "无效的笔记" };

  return deleteNoteAction(noteId);
}
