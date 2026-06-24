"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { ui } from "@/lib/ui";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export default function LandingHero({ isAuthenticated }: LandingHeroProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-zinc-900/[0.04] blur-3xl dark:bg-white/[0.04]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[360px] w-[360px] rounded-full bg-zinc-300/40 blur-3xl dark:bg-zinc-800/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex max-w-3xl flex-col items-center"
      >
        <div className={ui.badge}>
          <Sparkles size={12} />
          Built for clarity and speed
        </div>

        <h1 className={`mt-8 text-[44px] font-extralight leading-[1.05] tracking-[-0.03em] sm:text-[64px] sm:leading-[1.02] ${ui.mainTitle}`}>
          Your workspace,
          <br />
          <span className={ui.titleAccent}>reimagined.</span>
        </h1>

        <p className={`mt-6 max-w-xl text-[17px] font-normal leading-relaxed sm:text-[18px] ${ui.mainDesc}`}>
          A minimal account system with notes, friends, and realtime chat —
          designed with the precision of Apple and the focus of Linear.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={isAuthenticated ? "/dashboard" : "/register"}
            className={`group inline-flex items-center gap-2 px-6 py-3 text-[14px] font-semibold ${ui.btnPrimary}`}
          >
            {isAuthenticated ? "Open Dashboard" : "Start for free"}
            <ArrowRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href={isAuthenticated ? "/notes" : "/login"}
            className={`inline-flex items-center px-6 py-3 text-[14px] font-medium ${ui.btnSecondary}`}
          >
            {isAuthenticated ? "View Notes" : "Sign in"}
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="relative z-10 mt-24 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
        id="features"
      >
        {[
          {
            title: "Secure by default",
            body: "Authentication, profiles, and protected routes out of the box.",
          },
          {
            title: "Realtime chat",
            body: "Message friends instantly with live updates and notifications.",
          },
          {
            title: "Thoughtful UI",
            body: "Clean typography, subtle motion, and zero visual noise.",
          },
        ].map((item, i) => (
          <div key={item.title} className={`text-left ${ui.cardSm}`}>
            <p className={ui.eyebrow}>0{i + 1}</p>
            <h3 className={`mt-3 text-[15px] font-semibold ${ui.textPrimary}`}>
              {item.title}
            </h3>
            <p className={`mt-2 text-[14px] leading-relaxed ${ui.sidebarMuted}`}>
              {item.body}
            </p>
          </div>
        ))}
      </motion.div>
    </main>
  );
}
