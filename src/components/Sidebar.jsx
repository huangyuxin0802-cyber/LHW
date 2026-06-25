"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { ui } from "@/lib/ui";

const navItems = [
  { id: "home", label: "首页", href: "/", icon: HomeIcon },
  { id: "dashboard", label: "个人主页", href: "/dashboard", icon: UserIcon },
  { id: "profile", label: "个人资料", href: "/profile", icon: ProfileIcon },
  { id: "expenses", label: "记账本", href: "/expenses", icon: ExpenseIcon },
  { id: "map", label: "折扣地图", href: "/map", icon: MapIcon },
  { id: "notes", label: "笔记", href: "/notes", icon: NotesIcon },
  { id: "calculator", label: "计算器", href: "/calculator", icon: CalcIcon },
  { id: "friends", label: "好友", href: "/friends", icon: FriendsIcon },
];

export default function Sidebar({ activeItem = "dashboard", user, footer }) {
  return (
    <aside
      className={`flex h-full w-[240px] shrink-0 flex-col border-r ${ui.sidebar}`}
    >
      <div className="px-5 py-6">
        <Link
          href="/"
          className={`text-[21px] font-semibold tracking-tight ${ui.sidebarBrand}`}
        >
          LHW
        </Link>
        <p className={`mt-1 text-[13px] ${ui.sidebarMuted}`}>个人账户</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ id, label, href, icon: Icon }) => {
          const isActive = activeItem === id;
          return (
            <Link
              key={id}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                isActive ? ui.sidebarLinkActive : ui.sidebarLink
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <ThemeToggle compact />
      </div>

      {user && (
        <div className={`border-t px-5 py-4 ${ui.divider}`}>
          <p className={`truncate text-[15px] font-medium ${ui.sidebarUser}`}>
            {user.name}
          </p>
          {user.email && (
            <p className={`mt-0.5 truncate text-[13px] ${ui.sidebarMuted}`}>
              {user.email}
            </p>
          )}
          {footer && <div className="mt-3">{footer}</div>}
        </div>
      )}
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M7 17c0-2.2 2.2-4 5-4s5 1.8 5 4" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h2" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l-6-3V6l6 3 6-3 6 3v9l-6-3-6 3z" />
      <path d="M9 6v9M15 3v9" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

function CalcIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M12 10h2M16 10h0M8 14h2M12 14h2M8 18h8" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5M14 19c0-2 1.5-3.5 3.5-3.5" />
    </svg>
  );
}
