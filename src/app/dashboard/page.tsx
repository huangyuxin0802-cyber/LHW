import { logoutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import Calculator from "@/components/Calculator";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login?next=/dashboard");
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
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f5f7]">
      <header className="sticky top-0 z-10 border-b border-black/[0.06] bg-[#f5f5f7]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-[15px] font-medium text-[#86868b] transition hover:text-[#1d1d1f]"
          >
            首页
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full px-5 py-2 text-[15px] font-medium text-[#0071e3] transition hover:bg-black/[0.04]"
            >
              退出登录
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[980px] flex-1 px-6 py-12 sm:py-16">
        <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-12">
          <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#86868b]">
            Welcome
          </p>
          <h1 className="mt-3 text-[40px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[48px]">
            你好，{displayName}
          </h1>
          <p className="mt-4 max-w-[520px] text-[19px] leading-relaxed text-[#86868b]">
            欢迎回来。这是你的个人空间，可以使用下方的计算器。
          </p>

          <dl className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f5f5f7] p-5">
              <dt className="text-[13px] font-medium text-[#86868b]">
                {profile ? "用户名" : "显示名"}
              </dt>
              <dd className="mt-2 text-[21px] font-medium text-[#1d1d1f]">
                {displayName}
              </dd>
            </div>
            {email && (
              <div className="rounded-2xl bg-[#f5f5f7] p-5">
                <dt className="text-[13px] font-medium text-[#86868b]">邮箱</dt>
                <dd className="mt-2 break-all text-[17px] font-medium text-[#1d1d1f]">
                  {email}
                </dd>
              </div>
            )}
            <div className="rounded-2xl bg-[#f5f5f7] p-5">
              <dt className="text-[13px] font-medium text-[#86868b]">
                注册时间
              </dt>
              <dd className="mt-2 text-[17px] font-medium text-[#1d1d1f]">
                {joinedDate ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-12">
          <h2 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
            计算器
          </h2>
          <p className="mt-2 text-[17px] text-[#86868b]">
            支持加减乘除、小数与百分比
          </p>
          <div className="mt-8 flex justify-center">
            <Calculator />
          </div>
        </section>
      </main>
    </div>
  );
}
