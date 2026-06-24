import { logoutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import Main from "@/components/Main";
import MessageNotificationProvider from "@/components/MessageNotificationProvider";
import Sidebar from "@/components/Sidebar";
import { ui } from "@/lib/ui";
import { redirect } from "next/navigation";

export async function getDashboardUser(next = "/dashboard") {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
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

  const displayName = profile?.username ?? (email || "User");

  return {
    userId,
    displayName,
    email,
    profile,
  };
}

export function DashboardLogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={`w-full rounded-full px-4 py-2 text-[14px] font-medium transition ${ui.logoutBtn}`}
      >
        退出登录
      </button>
    </form>
  );
}

export async function DashboardLayout({
  activeItem,
  title,
  description,
  children,
}) {
  const { displayName, email, userId } = await getDashboardUser();

  return (
    <MessageNotificationProvider userId={userId}>
      <div className={`flex min-h-screen ${ui.shell}`}>
        <Sidebar
          activeItem={activeItem}
          user={{ name: displayName, email }}
          footer={<DashboardLogoutButton />}
        />
        <Main title={title} description={description}>
          {children}
        </Main>
      </div>
    </MessageNotificationProvider>
  );
}
