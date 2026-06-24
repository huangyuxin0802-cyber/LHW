"use client";

import Link from "next/link";

const navItems = [
  { id: "home", label: "首页", href: "/", icon: HomeIcon },
  { id: "dashboard", label: "个人主页", href: "/dashboard", icon: UserIcon },
  { id: "notes", label: "笔记", href: "/notes", icon: NotesIcon },
];

export default function Sidebar({ activeItem = "dashboard", user, footer }) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-black/[0.06] bg-white">
      <div className="px-5 py-6">
        <Link
          href="/"
          className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]"
        >
          LHW
        </Link>
        <p className="mt-1 text-[13px] text-[#86868b]">个人账户</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ id, label, href, icon: Icon }) => {
          const isActive = activeItem === id;
          return (
            <Link
              key={id}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                isActive
                  ? "bg-[#0071e3]/10 text-[#0071e3]"
                  : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
              }`}
            >
              <Icon active={isActive} />
              {label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-black/[0.06] px-5 py-4">
          <p className="truncate text-[15px] font-medium text-[#1d1d1f]">
            {user.name}
          </p>
          {user.email && (
            <p className="mt-0.5 truncate text-[13px] text-[#86868b]">
              {user.email}
            </p>
          )}
          {footer && <div className="mt-3">{footer}</div>}
        </div>
      )}
    </aside>
  );
}

function HomeIcon({ active }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}

function UserIcon({ active }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}
