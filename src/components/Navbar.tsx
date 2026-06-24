"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { ui } from "@/lib/ui";

const navLinks = [
  { label: "Map", href: "/map" },
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
        className={`mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border px-4 pl-5 backdrop-blur-xl sm:px-6 ${ui.navBar}`}
      >
        <Link
          href="/"
          className={`text-[15px] font-semibold tracking-tight transition-opacity hover:opacity-80 ${ui.sidebarBrand}`}
        >
          LHW
        </Link>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-wide transition-colors ${ui.navLink}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <div className={`relative shrink-0 rounded-full p-px ${ui.navCtaRing}`}>
            <Link
              href={ctaHref}
              className={`group relative flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition ${ui.navCta}`}
            >
              {ctaLabel}
              <ArrowUpRight
                size={14}
                strokeWidth={2}
                className={`transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${ui.navLink}`}
              />
            </Link>
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
