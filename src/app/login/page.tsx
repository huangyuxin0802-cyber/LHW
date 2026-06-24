import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { ui } from "@/lib/ui";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const callbackError =
    error === "email_confirmation_failed"
      ? "邮箱验证失败或链接已过期，请重新注册或重发验证邮件。"
      : undefined;

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl"
      />
      <AuthForm mode="login" next={next} callbackError={callbackError} />
      <Link href="/" className={`relative mt-10 ${ui.link}`}>
        返回首页
      </Link>
    </div>
  );
}
