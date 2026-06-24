"use server";

import { createClient } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export type FriendActionState = {
  error?: string;
  success?: string;
};

export async function addFriendByEmailAction(
  _prevState: FriendActionState,
  formData: FormData
): Promise<FriendActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { error: "请先登录" };

  const { data: targetId, error: lookupError } = await supabase.rpc(
    "find_user_id_by_email",
    { target_email: email }
  );

  if (lookupError) return { error: lookupError.message };
  if (!targetId) return { error: "未找到该邮箱对应的用户" };
  if (targetId === userId) return { error: "不能添加自己为好友" };

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`
    )
    .maybeSingle();

  if (existing?.status === "accepted") {
    return { error: "你们已经是好友了" };
  }
  if (existing?.status === "pending") {
    if (existing.requester_id === targetId) {
      const { error: acceptError } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", existing.id);
      if (acceptError) return { error: acceptError.message };
      revalidatePath("/friends");
      return { success: "对方也曾向你发送请求，已自动成为好友！" };
    }
    return { error: "好友请求已发送，等待对方确认" };
  }

  const { error: insertError } = await supabase.from("friendships").insert({
    requester_id: userId,
    addressee_id: targetId,
    status: "pending",
  });

  if (insertError) return { error: insertError.message };

  revalidatePath("/friends");
  return { success: `已向 ${email} 发送好友请求` };
}

export async function respondFriendRequestAction(
  friendshipId: string,
  accept: boolean
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "rejected" })
    .eq("id", friendshipId);

  if (error) return { error: error.message };

  revalidatePath("/friends");
  return {};
}

export async function acceptFriendFormAction(formData: FormData) {
  const friendshipId = String(formData.get("friendshipId") ?? "");
  return respondFriendRequestAction(friendshipId, true);
}

export async function rejectFriendFormAction(formData: FormData) {
  const friendshipId = String(formData.get("friendshipId") ?? "");
  return respondFriendRequestAction(friendshipId, false);
}

export async function removeFriendAction(friendshipId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) return { error: error.message };

  revalidatePath("/friends");
  return {};
}

export async function removeFriendFormAction(formData: FormData) {
  const friendshipId = String(formData.get("friendshipId") ?? "");
  return removeFriendAction(friendshipId);
}
