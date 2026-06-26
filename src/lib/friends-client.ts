import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/validation";

export type FriendActionState = {
  error?: string;
  success?: string;
};

export async function addFriendByEmailClient(
  formData: FormData
): Promise<FriendActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const supabase = createClient();
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

  return { success: `已向 ${email} 发送好友请求` };
}

export async function respondFriendRequestClient(
  friendshipId: string,
  accept: boolean
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "rejected" })
    .eq("id", friendshipId);

  if (error) return { error: error.message };
  return {};
}

export async function removeFriendClient(friendshipId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (error) return { error: error.message };
  return {};
}

export async function loadFriendsPageData(userId: string) {
  const supabase = createClient();

  const { data: friendships, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const accepted: Array<{
    friendshipId: string;
    userId: string;
  }> = [];
  const incoming: Array<{
    id: string;
    requesterId: string;
    created_at: string;
  }> = [];
  const outgoing: Array<{
    id: string;
    addresseeId: string;
    created_at: string;
  }> = [];
  const relatedIds = new Set<string>();

  for (const f of friendships ?? []) {
    if (f.status === "accepted") {
      const otherId =
        f.requester_id === userId ? f.addressee_id : f.requester_id;
      relatedIds.add(otherId);
      accepted.push({
        friendshipId: f.id,
        userId: otherId,
      });
    } else if (f.status === "pending") {
      if (f.addressee_id === userId) {
        relatedIds.add(f.requester_id);
        incoming.push({
          id: f.id,
          requesterId: f.requester_id,
          created_at: f.created_at,
        });
      } else {
        relatedIds.add(f.addressee_id);
        outgoing.push({
          id: f.id,
          addresseeId: f.addressee_id,
          created_at: f.created_at,
        });
      }
    }
  }

  const profileMap = Object.fromEntries(
    (
      await (async () => {
        if (relatedIds.size === 0) return [];
        const { data } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", [...relatedIds]);
        return data ?? [];
      })()
    ).map((p) => [p.id, p])
  );

  return {
    friends: accepted.map((f) => ({
      ...f,
      profile: profileMap[f.userId] ?? null,
    })),
    incoming: incoming.map((r) => ({
      ...r,
      profile: profileMap[r.requesterId] ?? null,
    })),
    outgoing: outgoing.map((r) => ({
      ...r,
      profile: profileMap[r.addresseeId] ?? null,
    })),
  };
}
