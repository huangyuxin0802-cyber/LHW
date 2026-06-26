import { Cpu, Download, Ghost } from "lucide-react";
import Link from "next/link";

const DOWNLOAD_URL = "/downloads/ghost-mac.zip";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://lhw-six.vercel.app";

export const metadata = {
  title: "下载小幽灵",
  description: "下载 macOS 桌面宠物小幽灵，支持 Apple Silicon 与 Intel Mac",
};

const CHIPS = [
  { label: "Apple Silicon", detail: "M1 / M2 / M3 / M4" },
  { label: "Intel Mac", detail: "x86_64 芯片" },
] as const;

export default function DownloadPage() {
  const absoluteDownload = `${SITE_URL}${DOWNLOAD_URL}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-6 py-14 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.28),transparent_42%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.16),transparent_40%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-xl flex-col">
        <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/15 shadow-[0_0_40px_rgba(139,92,246,0.25)]">
          <Ghost className="h-7 w-7 text-violet-200" strokeWidth={2.25} />
        </div>

        <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-violet-300">
          Desktop Pet
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-[2.6rem]">
          下载小幽灵
        </h1>
        <p className="mt-4 max-w-lg text-[17px] font-medium leading-relaxed text-zinc-100">
          macOS 桌面宠物，双击紫色悬浮球即可展开聊天。一个安装包，两种芯片都能用。
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {CHIPS.map((chip) => (
            <div
              key={chip.label}
              className="inline-flex items-center gap-2 rounded-full border border-violet-400/35 bg-violet-500/10 px-3.5 py-2"
            >
              <Cpu className="h-4 w-4 text-violet-300" />
              <div>
                <p className="text-[13px] font-semibold text-white">{chip.label}</p>
                <p className="text-[11px] font-medium text-violet-200/90">
                  {chip.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <a
          href={DOWNLOAD_URL}
          className="mt-9 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-violet-500 px-6 py-3.5 text-[16px] font-bold text-white shadow-[0_12px_32px_rgba(124,58,237,0.45)] transition hover:bg-violet-400"
        >
          <Download className="h-5 w-5" />
          下载 macOS 通用版 (.zip)
        </a>

        <p className="mt-3 break-all text-[12px] font-medium text-violet-200/80">
          {absoluteDownload}
        </p>

        <section className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
          <h2 className="text-[17px] font-bold text-white">安装步骤</h2>
          <ol className="list-decimal space-y-3 pl-5 text-[15px] font-medium leading-relaxed text-zinc-100">
            <li>下载 zip 并解压，得到「小幽灵.app」</li>
            <li>把 app 拖到「应用程序」文件夹</li>
            <li>
              首次打开若提示无法验证，去「系统设置 → 隐私与安全性」点
              <span className="font-bold text-white">仍要打开</span>
            </li>
            <li>
              或在终端运行：
              <code className="mt-1 block rounded-lg bg-black/40 px-3 py-2 text-[13px] font-semibold text-violet-200">
                xattr -cr /Applications/小幽灵.app
              </code>
            </li>
          </ol>
          <p className="text-[14px] font-medium leading-relaxed text-zinc-300">
            已安装的用户可在 app 内
            <span className="font-bold text-white">设置 → 检查更新</span>
            ，会自动联网升级。
          </p>
        </section>

        <Link
          href="/"
          className="mt-8 text-[15px] font-semibold text-violet-300 transition hover:text-violet-200"
        >
          ← 返回首页
        </Link>
      </div>
    </main>
  );
}
