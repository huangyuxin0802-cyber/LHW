import { DashboardLayout, getDashboardUser } from "@/components/DashboardLayout";
import ProfilePanel from "@/components/ProfilePanel";

export default async function ProfilePage() {
  const { userId, displayName, email, profile } = await getDashboardUser("/profile");

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <DashboardLayout
      activeItem="profile"
      title="个人资料"
      description="管理你的昵称与账户信息"
      theme="dark"
    >
      <ProfilePanel
        username={displayName}
        email={email}
        joinedDate={joinedDate}
        userId={userId}
      />
    </DashboardLayout>
  );
}
