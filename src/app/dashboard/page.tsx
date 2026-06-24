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
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            首页
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              退出登录
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <section className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-medium uppercase tracking-wider text-indigo-600">
            Welcome
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            你好，{displayName}！
          </h1>
          <p className="mt-3 text-lg text-zinc-600">
            欢迎回来，这是你的个人主页。你可以在这里使用计算器，或查看账户信息。
          </p>

          <dl className="mt-8 grid gap-4 rounded-xl bg-zinc-50 p-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {profile ? "用户名" : "显示名"}
              </dt>
              <dd className="mt-1 text-lg font-medium text-zinc-900">
                {displayName}
              </dd>
            </div>
            {email && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  邮箱
                </dt>
                <dd className="mt-1 text-lg font-medium text-zinc-900 break-all">
                  {email}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                注册时间
              </dt>
              <dd className="mt-1 text-lg font-medium text-zinc-900">
                {joinedDate ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
          <h2 className="text-xl font-semibold text-zinc-900">计算器</h2>
          <p className="mt-1 text-sm text-zinc-500">
            支持加减乘除、正负号与百分比
          </p>
          <div className="mt-6 flex justify-center">
            <Calculator />
          </div>
        </section>
      </main>
    </div>
  );
}
