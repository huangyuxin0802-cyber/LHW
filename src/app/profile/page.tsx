import { logoutAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, created_at")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">
            Profile not found
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Your account exists but no profile was created. Please contact
            support or register again.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const joinedDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-indigo-50 to-white">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Home
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-medium uppercase tracking-wider text-indigo-600">
            Personal Center
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Hello, {profile.username}
          </h1>
          <p className="mt-3 text-zinc-500">
            You are signed in. This page is only visible to authenticated users.
          </p>

          <dl className="mt-8 grid gap-4 rounded-xl bg-zinc-50 p-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Username
              </dt>
              <dd className="mt-1 text-lg font-medium text-zinc-900">
                {profile.username}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Member since
              </dt>
              <dd className="mt-1 text-lg font-medium text-zinc-900">
                {joinedDate}
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
