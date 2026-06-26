"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout, useDashboardUser } from "@/components/DashboardLayout";
import ChatRoom from "@/components/ChatRoom";
import { createClient } from "@/lib/supabase/client";
import { ui } from "@/lib/ui";

export default function ChatPageClient() {
  const params = useParams<{ friendId: string }>();
  const friendId = params.friendId;
  const router = useRouter();
  const { userId, displayName, loading } = useDashboardUser(
    `/chat/${friendId}`
  );
  const [friendName, setFriendName] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      sender_id: string;
      recipient_id: string;
      content: string;
      created_at: string;
    }>
  >([]);
  const [chatLoading, setChatLoading] = useState(true);

  useEffect(() => {
    if (!userId || !friendId || friendId === "_") {
      return;
    }

    let cancelled = false;

    const load = async () => {
      const supabase = createClient();

      const { data: friendship } = await supabase
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
        )
        .eq("status", "accepted")
        .maybeSingle();

      if (!friendship) {
        router.replace("/friends");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", friendId)
        .maybeSingle();

      const { data: messageRows, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, content, created_at")
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        router.replace("/friends");
        return;
      }

      setFriendName(profile?.username ?? `用户 ${friendId.slice(0, 8)}`);
      setMessages(messageRows ?? []);
      setChatLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [friendId, router, userId]);

  if (loading || chatLoading || !userId || !displayName || !friendId) {
    return null;
  }

  return (
    <DashboardLayout
      activeItem="friends"
      title="聊天"
      description={`与 ${friendName} 的对话`}
    >
      <Link href="/friends" className={`mb-4 inline-block ${ui.link}`}>
        ← 返回好友列表
      </Link>
      <ChatRoom
        currentUserId={userId}
        currentUsername={displayName}
        friendId={friendId}
        friendName={friendName}
        initialMessages={messages}
      />
    </DashboardLayout>
  );
}
