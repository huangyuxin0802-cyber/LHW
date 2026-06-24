"use server";

import { createClient } from "@/lib/supabase/server";
import { validateNickname } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export type ProfileActionState = {
  error?: string;
  success?: string;
  username?: string;
};

export async function updateUsernameAction(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const username = String(formData.get("username") ?? "");
  const nicknameError = validateNickname(username);
  if (nicknameError) return { error: nicknameError };

  const trimmed = username.trim();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { error: "请先登录" };

  const { error } = await supabase
    .from("profiles")
    .update({ username: trimmed })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") return { error: "该昵称已被使用，请换一个" };
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/friends");

  return { success: "昵称已更新", username: trimmed };
}
