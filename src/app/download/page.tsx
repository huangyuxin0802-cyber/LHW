import Link from "next/link";

const DOWNLOAD_URL = "/downloads/ghost-mac.zip";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://lhw-six.vercel.app";

export const metadata = {
  title: "下载小幽灵",
  description: "下载 macOS 桌面宠物小幽灵",
};

export default function DownloadPage() {
  const absoluteDownload = `${SITE_URL}${DOWNLOAD_URL}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-violet-600">Desktop Pet</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
        下载小幽灵
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">
        macOS 桌面宠物，双击悬浮球即可聊天。目前支持 Apple Silicon（M 系列芯片）Mac。
      </p>

      <a
        href={DOWNLOAD_URL}
        className="mt-8 inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-violet-500"
      >
        下载 macOS 版 (.zip)
      </a>

      <p className="mt-3 break-all text-[12px] text-zinc-500">{absoluteDownload}</p>

      <section className="mt-10 space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-[14px] leading-relaxed text-zinc-700">
        <h2 className="font-semibold text-zinc-900">安装步骤</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>下载 zip 并解压，得到「小幽灵.app」</li>
          <li>把 app 拖到「应用程序」文件夹</li>
          <li>首次打开若提示无法验证，去「系统设置 → 隐私与安全性」点「仍要打开」</li>
          <li>或在终端运行：xattr -cr /Applications/小幽灵.app</li>
        </ol>
        <p className="text-[13px] text-zinc-500">
          已安装的用户可在 app 内「设置」里检查更新，会自动联网升级。
        </p>
      </section>

      <Link
        href="/"
        className="mt-8 text-[14px] font-medium text-violet-600 hover:text-violet-500"
      >
        返回首页
      </Link>
    </main>
  );
}
