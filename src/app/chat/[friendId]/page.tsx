import { createClient } from "@/lib/supabase/server";
import { DashboardLayout, getDashboardUser } from "@/components/DashboardLayout";
import ChatRoom from "@/components/ChatRoom";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ChatPageProps = {
  params: Promise<{ friendId: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { friendId } = await params;
  const { userId } = await getDashboardUser(`/chat/${friendId}`);
  const supabase = await createClient();

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
    )
    .eq("status", "accepted")
    .maybeSingle();

  if (!friendship) {
    redirect("/friends");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", friendId)
    .maybeSingle();

  const friendName = profile?.username ?? `用户 ${friendId.slice(0, 8)}`;

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, content, created_at")
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`
    )
    .order("created_at", { ascending: true });

  if (error) notFound();

  return (
    <DashboardLayout
      activeItem="friends"
      title="聊天"
      description={`与 ${friendName} 的对话`}
    >
      <Link
        href="/friends"
        className="mb-4 inline-block text-[15px] text-[#0071e3] hover:underline"
      >
        ← 返回好友列表
      </Link>
      <ChatRoom
        currentUserId={userId}
        friendId={friendId}
        friendName={friendName}
        initialMessages={messages ?? []}
      />
    </DashboardLayout>
  );
}
