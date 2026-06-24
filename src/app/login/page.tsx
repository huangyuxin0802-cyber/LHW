import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4 py-12">
      <AuthForm mode="login" next={next} />
      <Link
        href="/"
        className="mt-6 text-sm text-zinc-500 hover:text-zinc-700"
      >
        ← Back to home
      </Link>
    </div>
  );
}
