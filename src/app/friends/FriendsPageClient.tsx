"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout, useDashboardUser } from "@/components/DashboardLayout";
import FriendsPanel from "@/components/FriendsPanel";
import { loadFriendsPageData } from "@/lib/friends-client";

export default function FriendsPageClient() {
  const { userId, loading } = useDashboardUser("/friends");
  const [data, setData] = useState<{
    friends: Array<{
      friendshipId: string;
      userId: string;
      profile: { username?: string } | null;
    }>;
    incoming: Array<{
      id: string;
      requesterId: string;
      created_at: string;
      profile: { username?: string } | null;
    }>;
    outgoing: Array<{
      id: string;
      addresseeId: string;
      created_at: string;
      profile: { username?: string } | null;
    }>;
  }>({
    friends: [],
    incoming: [],
    outgoing: [],
  });
  const [dataLoading, setDataLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);
    try {
      setData(await loadFriendsPageData(userId));
    } finally {
      setDataLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
  }, [userId, refresh]);

  if (loading || dataLoading || !userId) {
    return null;
  }

  return (
    <DashboardLayout
      activeItem="friends"
      title="好友"
      description="通过邮箱添加好友，开始聊天。"
    >
      <FriendsPanel {...data} onRefresh={refresh} />
    </DashboardLayout>
  );
}
