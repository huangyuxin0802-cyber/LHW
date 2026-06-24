import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

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
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#f5f5f7] px-6 py-16">
      <AuthForm mode="login" next={next} callbackError={callbackError} />
      <Link
        href="/"
        className="mt-10 text-[15px] text-[#86868b] transition hover:text-[#1d1d1f]"
      >
        返回首页
      </Link>
    </div>
  );
}
