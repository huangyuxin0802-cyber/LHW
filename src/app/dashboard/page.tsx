import { DashboardLayout, getDashboardUser } from "@/components/DashboardLayout";

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
      <section className="rounded-[24px] bg-white p-8 shadow-[0_2px_24px_rgba(0,0,0,0.06)] sm:p-10">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#86868b]">
          Welcome
        </p>
        <h2 className="mt-2 text-[32px] font-semibold tracking-tight text-[#1d1d1f]">
          账户概览
        </h2>

        <dl className="mt-8 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#f5f5f7] p-5">
            <dt className="text-[13px] font-medium text-[#86868b]">
              {profile ? "用户名" : "显示名"}
            </dt>
            <dd className="mt-2 text-[21px] font-medium text-[#1d1d1f]">
              {displayName}
            </dd>
          </div>
          {email && (
            <div className="rounded-2xl bg-[#f5f5f7] p-5">
              <dt className="text-[13px] font-medium text-[#86868b]">邮箱</dt>
              <dd className="mt-2 break-all text-[17px] font-medium text-[#1d1d1f]">
                {email}
              </dd>
            </div>
          )}
          <div className="rounded-2xl bg-[#f5f5f7] p-5">
            <dt className="text-[13px] font-medium text-[#86868b]">
              注册时间
            </dt>
            <dd className="mt-2 text-[17px] font-medium text-[#1d1d1f]">
              {joinedDate ?? "—"}
            </dd>
          </div>
        </dl>
      </section>
    </DashboardLayout>
  );
}
