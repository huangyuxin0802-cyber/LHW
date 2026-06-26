import { createClient } from "@/lib/supabase/client";

export type MessageActionState = {
  error?: string;
};

export async function sendMessageClient(
  formData: FormData
): Promise<MessageActionState> {
  const recipientId = String(formData.get("recipientId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!recipientId) return { error: "无效的聊天对象" };
  if (!content) return { error: "消息不能为空" };
  if (content.length > 2000) return { error: "消息不能超过 2000 字" };

  const supabase = createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { error: "请先登录" };

  const { error } = await supabase.from("messages").insert({
    sender_id: userId,
    recipient_id: recipientId,
    content,
  });

  if (error) return { error: error.message };
  return {};
}
