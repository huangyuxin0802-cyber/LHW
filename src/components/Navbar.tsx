"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#docs" },
];

type NavbarProps = {
  ctaHref?: string;
  ctaLabel?: string;
};

export default function Navbar({
  ctaHref = "/register",
  ctaLabel = "Get Started",
}: NavbarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-5 sm:px-6"
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/10 bg-zinc-950/60 px-4 pl-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-6"
      >
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          LHW
        </Link>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-wide text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="relative ml-auto shrink-0 rounded-full bg-gradient-to-r from-white/60 via-white/15 to-white/50 p-px shadow-[0_0_24px_rgba(255,255,255,0.12)]">
          <Link
            href={ctaHref}
            className="group relative flex items-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-900"
          >
            {ctaLabel}
            <ArrowUpRight
              size={14}
              strokeWidth={2}
              className="text-zinc-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
            />
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
