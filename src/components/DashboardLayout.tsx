"use client";

import { logoutClient } from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";
import Main from "@/components/Main";
import MessageNotificationProvider from "@/components/MessageNotificationProvider";
import Sidebar from "@/components/Sidebar";
import { ui } from "@/lib/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export function DashboardLogoutButton() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    const result = await logoutClient();
    if (result.redirectTo) {
      router.push(result.redirectTo);
    }
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className={`w-full rounded-full px-4 py-2 text-[14px] font-medium transition ${ui.logoutBtn}`}
    >
      退出登录
    </button>
  );
}

type DashboardUserState = {
  userId: string;
  displayName: string;
  email: string;
  profile: { username: string | null; created_at: string | null } | null;
};

export function useDashboardUser(next = "/dashboard") {
  const router = useRouter();
  const [state, setState] = useState<DashboardUserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      const { data: claimsData } = await supabase.auth.getClaims();
      const userId = claimsData?.claims?.sub;

      if (!userId) {
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email ?? "";

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (!cancelled) {
        setState({
          userId,
          displayName: profile?.username ?? (email || "User"),
          email,
          profile,
        });
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [next, router]);

  return { ...state, loading };
}

type DashboardLayoutProps = {
  activeItem: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function DashboardLayout({
  activeItem,
  title,
  description,
  children,
}: DashboardLayoutProps) {
  const { userId, displayName, email, loading } = useDashboardUser();

  if (loading || !userId || !displayName) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${ui.shell}`}>
        <p className="text-sm text-zinc-500">加载中…</p>
      </div>
    );
  }

  return (
    <MessageNotificationProvider userId={userId}>
      <div className={`flex min-h-screen ${ui.shell}`}>
        <Sidebar
          activeItem={activeItem}
          user={{ name: displayName, email: email ?? "" }}
          footer={<DashboardLogoutButton />}
        />
        <Main title={title} description={description}>
          {children}
        </Main>
      </div>
    </MessageNotificationProvider>
  );
}
