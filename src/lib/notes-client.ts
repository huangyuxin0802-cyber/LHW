import { createClient } from "@/lib/supabase/client";

export type NoteActionState = {
  error?: string;
};

export async function createNoteClient(
  formData: FormData
): Promise<NoteActionState> {
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "笔记内容不能为空" };
  }

  if (content.length > 5000) {
    return { error: "笔记内容不能超过 5000 字" };
  }

  const supabase = createClient();
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

  return {};
}

export async function deleteNoteClient(noteId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  if (error) {
    return { error: error.message };
  }

  return {};
}
