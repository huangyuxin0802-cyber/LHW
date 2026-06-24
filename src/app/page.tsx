import { createClient } from "@/lib/supabase/server";
import LandingHero from "@/components/LandingHero";
import Navbar from "@/components/Navbar";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <Navbar
        ctaHref={isAuthenticated ? "/dashboard" : "/register"}
        ctaLabel={isAuthenticated ? "Dashboard" : "Get Started"}
      />
      <LandingHero isAuthenticated={isAuthenticated} />
    </div>
  );
}
