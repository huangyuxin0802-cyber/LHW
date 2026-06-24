import Link from "next/link";
import { DashboardLayout, getDashboardUser } from "@/components/DashboardLayout";
import { ui } from "@/lib/ui";

export default async function DashboardPage() {
  const { displayName, email, profile } = await getDashboardUser();

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <DashboardLayout
      activeItem="dashboard"
      title={`你好，${displayName}`}
      description="欢迎回来，这是你的个人空间。"
    >
      <section className={ui.card}>
        <div aria-hidden className={ui.pageGlow} />
        <p className={ui.eyebrow}>Overview</p>
        <h2 className={`mt-2 ${ui.titleLg}`}>
          账户<span className={ui.titleAccent}>概览</span>
        </h2>
        <p className={`mt-3 max-w-lg ${ui.subtitle}`}>
          快速查看你的账户信息，或前往个人资料修改昵称。
        </p>

        <dl className="relative mt-8 grid gap-4 sm:grid-cols-3">
          <div className={ui.cardSm}>
            <dt className={ui.label}>昵称</dt>
            <dd className="mt-2 text-[21px] font-medium text-zinc-100">
              {displayName}
            </dd>
          </div>
          {email && (
            <div className={ui.cardSm}>
              <dt className={ui.label}>邮箱</dt>
              <dd className="mt-2 break-all text-[17px] font-medium text-zinc-100">
                {email}
              </dd>
            </div>
          )}
          <div className={ui.cardSm}>
            <dt className={ui.label}>注册时间</dt>
            <dd className="mt-2 text-[17px] font-medium text-zinc-100">
              {joinedDate ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link href="/profile" className={ui.btnPrimary}>
            编辑个人资料
          </Link>
          <Link href="/notes" className={ui.btnSecondary}>
            打开笔记
          </Link>
          <Link href="/friends" className={ui.btnSecondary}>
            好友与聊天
          </Link>
        </div>
      </section>
    </DashboardLayout>
  );
}
