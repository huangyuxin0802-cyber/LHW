"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (!code) {
      router.replace("/login?error=email_confirmation_failed");
      return;
    }

    let cancelled = false;

    const exchange = async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (cancelled) {
        return;
      }

      if (error) {
        router.replace("/login?error=email_confirmation_failed");
        return;
      }

      router.replace(next.startsWith("/") ? next : "/dashboard");
    };

    void exchange();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-zinc-500">正在验证邮箱…</p>
    </div>
  );
}
