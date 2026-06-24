import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4 py-12">
      <AuthForm mode="register" />
      <Link
        href="/"
        className="mt-6 text-sm text-zinc-500 hover:text-zinc-700"
      >
        ← Back to home
      </Link>
    </div>
  );
}
