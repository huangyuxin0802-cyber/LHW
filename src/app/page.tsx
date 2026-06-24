import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-indigo-50 to-white">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-semibold text-zinc-900">LHW Auth</span>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/profile"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                My Profile
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Simple auth for a global audience
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600">
          Register with email and password, sign in securely, and access your
          personal page from anywhere in the world.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Go to personal center
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
