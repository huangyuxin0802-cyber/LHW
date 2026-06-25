import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "createClient() is browser-only. Call it inside useEffect or event handlers."
    );
  }

  if (browserClient) {
    return browserClient;
  }

  const { url, key } = getSupabaseEnv();
  browserClient = createBrowserClient(url, key, { isSingleton: true });
  return browserClient;
}

/** Lazy accessor for modules that must not call createClient during SSR render. */
export function getBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }
  return createClient();
}
