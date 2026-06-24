import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f5f7]">
      <header className="sticky top-0 z-10 border-b border-black/[0.06] bg-[#f5f5f7]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 py-4">
          <span className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
            LHW
          </span>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-[#0071e3] px-5 py-2 text-[15px] font-medium text-white transition hover:bg-[#0077ed]"
              >
                进入主页
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-5 py-2 text-[15px] font-medium text-[#0071e3] transition hover:bg-black/[0.04]"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#0071e3] px-5 py-2 text-[15px] font-medium text-white transition hover:bg-[#0077ed]"
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-[15px] font-medium uppercase tracking-[0.18em] text-[#86868b]">
          Welcome
        </p>
        <h1 className="mt-4 max-w-[640px] text-[48px] font-semibold leading-[1.08] tracking-tight text-[#1d1d1f] sm:text-[56px]">
          简洁安全的
          <br />
          个人账户系统
        </h1>
        <p className="mt-6 max-w-[480px] text-[19px] leading-relaxed text-[#86868b]">
          注册、登录、访问你的专属主页。
          <br className="hidden sm:block" />
          全球可用，设计简约。
        </p>
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-[#0071e3] px-8 py-3.5 text-[17px] font-medium text-white transition hover:bg-[#0077ed]"
            >
              打开个人主页
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-full bg-[#0071e3] px-8 py-3.5 text-[17px] font-medium text-white transition hover:bg-[#0077ed]"
              >
                开始使用
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-white px-8 py-3.5 text-[17px] font-medium text-[#0071e3] shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition hover:bg-[#fafafa]"
              >
                登录
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
