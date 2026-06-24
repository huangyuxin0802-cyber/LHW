import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { ui } from "@/lib/ui";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl"
      />
      <AuthForm mode="register" />
      <Link href="/" className={`relative mt-10 ${ui.link}`}>
        返回首页
      </Link>
    </div>
  );
}
