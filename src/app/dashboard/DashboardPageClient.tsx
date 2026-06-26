"use client";

import Link from "next/link";
import {
  DashboardLayout,
  useDashboardUser,
} from "@/components/DashboardLayout";
import { ui } from "@/lib/ui";
import { Calendar, Mail, NotebookPen, UserRound, Users } from "lucide-react";

const quickLinks = [
  {
    href: "/profile",
    title: "编辑个人资料",
    description: "修改昵称与账户信息",
    icon: UserRound,
  },
  {
    href: "/notes",
    title: "打开笔记",
    description: "记录灵感与待办",
    icon: NotebookPen,
  },
  {
    href: "/friends",
    title: "好友与聊天",
    description: "查看好友、发起对话",
    icon: Users,
  },
] as const;

export default function DashboardPageClient() {
  const { displayName, email, profile, loading } = useDashboardUser();

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  if (loading || !displayName) {
    return null;
  }

  return (
    <DashboardLayout
      activeItem="dashboard"
      title={`你好，${displayName}`}
      description="欢迎回来，这是你的个人空间。"
    >
      <section className={`${ui.card} text-zinc-950 dark:text-zinc-100`}>
        <div aria-hidden className={ui.pageGlow} />
        <p className={ui.eyebrow}>Overview</p>
        <h2 className={`mt-2 ${ui.titleLg}`}>
          账户<span className={ui.titleAccent}>概览</span>
        </h2>
        <p className={`mt-3 max-w-lg ${ui.subtitle}`}>
          快速查看你的账户信息，或前往个人资料修改昵称。
        </p>

        <dl className="relative mt-8 grid gap-4 sm:grid-cols-3">
          <div className={ui.cardAccent}>
            <dt className={`flex items-center gap-2 ${ui.label}`}>
              <UserRound className="h-3.5 w-3.5 text-violet-500" />
              昵称
            </dt>
            <dd className={`mt-2 ${ui.statValue}`}>{displayName}</dd>
          </div>
          {email && (
            <div className={ui.cardSm}>
              <dt className={`flex items-center gap-2 ${ui.label}`}>
                <Mail className="h-3.5 w-3.5 text-sky-500" />
                邮箱
              </dt>
              <dd className={`mt-2 break-all ${ui.statValueSm}`}>{email}</dd>
            </div>
          )}
          <div className={ui.cardSm}>
            <dt className={`flex items-center gap-2 ${ui.label}`}>
              <Calendar className="h-3.5 w-3.5 text-amber-500" />
              注册时间
            </dt>
            <dd className={`mt-2 ${ui.statValueSm}`}>{joinedDate ?? "—"}</dd>
          </div>
        </dl>

        <div className="relative mt-10">
          <p className={ui.eyebrow}>Shortcuts</p>
          <h3 className="mt-2 text-[18px] font-semibold text-zinc-950 dark:text-zinc-100">
            快捷入口
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickLinks.map(({ href, title, description, icon: Icon }) => (
              <Link key={href} href={href} className={ui.quickLink}>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className={ui.quickLinkTitle}>{title}</p>
                    <p className={ui.quickLinkDesc}>{description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
