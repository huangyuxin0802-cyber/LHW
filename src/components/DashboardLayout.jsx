import { logoutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import Main from "@/components/Main";
import MessageNotificationProvider from "@/components/MessageNotificationProvider";
import Sidebar from "@/components/Sidebar";
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

export function DashboardLogoutButton({ theme = "light" }) {
  const isDark = theme === "dark";
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={`w-full rounded-full px-4 py-2 text-[14px] font-medium transition ${
          isDark
            ? "text-zinc-300 hover:bg-white/10 hover:text-white"
            : "text-[#0071e3] hover:bg-[#0071e3]/10"
        }`}
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
  theme = "light",
}) {
  const { displayName, email, userId } = await getDashboardUser();
  const isDark = theme === "dark";

  return (
    <MessageNotificationProvider userId={userId}>
      <div className={`flex min-h-screen ${isDark ? "bg-zinc-950" : ""}`}>
        <Sidebar
          activeItem={activeItem}
          user={{ name: displayName, email }}
          footer={<DashboardLogoutButton theme={theme} />}
          theme={theme}
        />
        <Main title={title} description={description} theme={theme}>
          {children}
        </Main>
      </div>
    </MessageNotificationProvider>
  );
}
