/** Shared UI tokens — light default, dark via `.dark` on `<html>` */
export const ui = {
  page: "min-h-screen bg-zinc-50 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300",
  pageGlow:
    "pointer-events-none absolute -left-8 -top-8 h-64 w-64 rounded-full bg-zinc-900/[0.04] blur-3xl dark:bg-white/[0.03]",
  pageGlowRight:
    "pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-zinc-900/[0.03] blur-3xl dark:bg-white/[0.02]",
  shell: "bg-zinc-50 dark:bg-zinc-950",
  sidebar:
    "border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-zinc-950",
  sidebarBrand: "text-zinc-900 dark:text-white",
  sidebarMuted: "text-zinc-500",
  sidebarUser: "text-zinc-900 dark:text-zinc-100",
  sidebarLinkActive:
    "bg-zinc-900/10 text-zinc-900 dark:bg-white/10 dark:text-white",
  sidebarLink:
    "text-zinc-500 hover:bg-black/[0.04] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white",
  main: "bg-zinc-50 dark:bg-zinc-950",
  mainHeader:
    "border-black/[0.06] bg-zinc-50/80 dark:border-white/[0.06] dark:bg-zinc-950/80",
  mainTitle: "text-zinc-950 dark:text-white",
  mainDesc: "text-zinc-700 dark:text-zinc-400",
  card: "relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none sm:p-10",
  cardSm:
    "rounded-2xl border border-black/[0.06] bg-zinc-50/90 p-5 backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.02]",
  cardAccent:
    "rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-zinc-50/80 p-5 shadow-sm dark:border-violet-500/20 dark:from-violet-950/40 dark:via-white/[0.02] dark:to-transparent dark:shadow-none",
  quickLink:
    "group flex flex-col rounded-2xl border border-black/[0.06] bg-white px-5 py-4 shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-violet-500/30",
  quickLinkTitle:
    "text-[15px] font-semibold text-zinc-950 transition group-hover:text-violet-800 dark:text-zinc-100 dark:group-hover:text-violet-200",
  quickLinkDesc:
    "mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-400",
  cardInner:
    "rounded-2xl border border-black/[0.06] bg-zinc-50 p-4 dark:border-white/[0.06] dark:bg-zinc-950/40",
  listItem:
    "rounded-2xl border border-black/[0.06] bg-zinc-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]",
  badge:
    "inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[12px] font-medium tracking-wide text-zinc-500 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 dark:shadow-none",
  avatar:
    "flex items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-100 text-zinc-900 ring-1 ring-black/[0.06] dark:from-white/20 dark:to-white/5 dark:text-white dark:ring-white/20",
  eyebrow:
    "text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-500",
  title: "text-[24px] font-semibold tracking-tight text-zinc-950 dark:text-white",
  titleLg:
    "text-[32px] font-extralight tracking-tight text-zinc-950 dark:text-white sm:text-[40px]",
  titleAccent: "font-semibold text-zinc-950 dark:text-zinc-100",
  subtitle: "mt-1 text-[15px] text-zinc-800 dark:text-zinc-400",
  label: "text-[13px] font-medium text-zinc-700 dark:text-zinc-400",
  statValue:
    "text-[21px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-100",
  statValueSm:
    "text-[17px] font-medium text-zinc-950 dark:text-zinc-100",
  body: "text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300",
  textPrimary: "text-zinc-900 dark:text-zinc-100",
  input:
    "w-full rounded-xl border border-black/[0.08] bg-zinc-50 px-4 py-3.5 text-[17px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-white/10",
  textarea:
    "w-full resize-none rounded-2xl border border-black/[0.08] bg-zinc-50 px-4 py-3.5 text-[17px] leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-white/10",
  inputSm:
    "flex-1 rounded-full border border-black/[0.08] bg-zinc-50 px-4 py-3 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:ring-white/10",
  btnPrimary:
    "rounded-full bg-zinc-900 px-6 py-2.5 text-[15px] font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
  btnPrimarySm:
    "rounded-full bg-zinc-900 px-4 py-1.5 text-[13px] font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
  btnSecondary:
    "rounded-full border border-black/[0.1] px-4 py-1.5 text-[13px] font-medium text-zinc-600 transition hover:border-black/20 hover:text-zinc-900 dark:border-white/10 dark:text-zinc-300 dark:hover:border-white/20 dark:hover:text-white",
  btnGhost:
    "rounded-full px-4 py-1.5 text-[13px] font-medium text-zinc-500 transition hover:bg-black/[0.04] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white",
  btnDanger:
    "rounded-full px-4 py-1.5 text-[13px] font-medium text-red-600 transition hover:bg-red-500/10 dark:text-red-400",
  link: "text-[15px] text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
  error: "text-[15px] text-red-600 dark:text-red-400",
  success: "text-[15px] text-emerald-600 dark:text-emerald-400",
  empty:
    "rounded-2xl border border-black/[0.06] bg-zinc-50 px-6 py-12 text-center text-zinc-500 dark:border-white/[0.06] dark:bg-white/[0.02]",
  divider: "border-black/[0.06] dark:border-white/[0.06]",
  chatMine:
    "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950",
  chatTheirs:
    "border border-black/[0.08] bg-white text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-zinc-100",
  navBar:
    "border-black/[0.08] bg-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
  navLink: "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
  navCtaRing:
    "bg-gradient-to-r from-zinc-900/20 via-zinc-400/10 to-zinc-900/20 shadow-[0_0_24px_rgba(0,0,0,0.06)] dark:from-white/60 dark:via-white/15 dark:to-white/50 dark:shadow-[0_0_24px_rgba(255,255,255,0.12)]",
  navCta:
    "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-900",
  logoutBtn:
    "text-zinc-600 hover:bg-black/[0.04] hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
};

export type Theme = "light" | "dark";
