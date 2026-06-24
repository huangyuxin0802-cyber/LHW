import { createClient } from "@/lib/supabase/server";
import LandingHero from "@/components/LandingHero";
import Navbar from "@/components/Navbar";
import { ui } from "@/lib/ui";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  return (
    <div className={ui.page}>
      <Navbar
        ctaHref={isAuthenticated ? "/dashboard" : "/register"}
        ctaLabel={isAuthenticated ? "Dashboard" : "Get Started"}
      />
      <LandingHero isAuthenticated={isAuthenticated} />
    </div>
  );
}
