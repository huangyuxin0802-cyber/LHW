import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional if vars are already exported
  }
}

function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function defaultUsername(email: string, userId: string) {
  const fromEmail = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "_");
  if (fromEmail && fromEmail.length >= 3) return fromEmail.slice(0, 20);
  return `user_${userId.replace(/-/g, "").slice(0, 8)}`;
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseKey();
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local"
    );
  }

  if (!email || !password) {
    throw new Error(
      "Add SEED_EMAIL and SEED_PASSWORD to .env.local (your login credentials)"
    );
  }

  const supabase = createClient(url, key);

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Sign in failed");
  }

  const userId = authData.user.id;
  const username =
    process.env.SEED_USERNAME?.trim() ||
    defaultUsername(authData.user.email ?? email, userId);

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    console.log(`Profile already exists for ${email}: ${existing.username}`);
    return;
  }

  const { data: profile, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId, username })
    .select("id, username, created_at")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  console.log("Profile created:");
  console.log(profile);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`seed-profile failed: ${message}`);
  process.exit(1);
});
