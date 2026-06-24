import { createClient } from "@/lib/supabase/server";
import { DashboardLayout, getDashboardUser } from "@/components/DashboardLayout";
import FriendsPanel from "@/components/FriendsPanel";

export default async function FriendsPage() {
  const { userId } = await getDashboardUser("/friends");
  const supabase = await createClient();

  const { data: friendships, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const accepted = [];
  const incoming = [];
  const outgoing = [];
  const relatedIds = new Set();

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

  return (
    <DashboardLayout
      activeItem="friends"
      title="好友"
      description="通过邮箱添加好友，开始聊天。"
    >
      <FriendsPanel
        friends={accepted.map((f) => ({
          ...f,
          profile: profileMap[f.userId] ?? null,
        }))}
        incoming={incoming.map((r) => ({
          ...r,
          profile: profileMap[r.requesterId] ?? null,
        }))}
        outgoing={outgoing.map((r) => ({
          ...r,
          profile: profileMap[r.addresseeId] ?? null,
        }))}
      />
    </DashboardLayout>
  );
}
