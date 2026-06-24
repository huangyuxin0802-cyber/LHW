import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#f5f5f7] px-6 py-16">
      <AuthForm mode="register" />
      <Link
        href="/"
        className="mt-10 text-[15px] text-[#86868b] transition hover:text-[#1d1d1f]"
      >
        返回首页
      </Link>
    </div>
  );
}
