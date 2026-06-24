import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import ThemeToggle from "@/components/ThemeToggle";
import { ui } from "@/lib/ui";

export default function RegisterPage() {
  return (
    <div className={`relative flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16 ${ui.page}`}>
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-zinc-900/[0.04] blur-3xl dark:bg-white/[0.03]"
      />
      <AuthForm mode="register" />
      <Link href="/" className={`relative mt-10 ${ui.link}`}>
        返回首页
      </Link>
    </div>
  );
}
