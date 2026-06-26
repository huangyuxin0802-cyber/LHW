"use client";

import { DashboardLayout, useDashboardUser } from "@/components/DashboardLayout";
import ProfilePanel from "@/components/ProfilePanel";
import SettingsPanel from "@/components/SettingsPanel";

export default function ProfilePageClient() {
  const { userId, displayName, email, profile, loading } =
    useDashboardUser("/profile");

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  if (loading || !userId || !displayName) {
    return null;
  }

  return (
    <DashboardLayout
      activeItem="profile"
      title="个人资料"
      description="管理你的昵称与账户信息"
    >
      <ProfilePanel
        username={displayName}
        email={email ?? ""}
        joinedDate={joinedDate}
        userId={userId}
      />
      <SettingsPanel />
    </DashboardLayout>
  );
}
