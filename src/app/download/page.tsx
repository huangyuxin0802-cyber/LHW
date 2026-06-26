import { AlertTriangle, Cpu, Download, Ghost, ShieldCheck } from "lucide-react";
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

        <section className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="text-[16px] font-bold text-amber-100">
                打不开？提示无法验证 / malware？
              </h2>
              <p className="mt-2 text-[14px] font-semibold leading-relaxed text-amber-50/95">
                这是 macOS 对未签名应用的正常拦截，不代表有病毒。小幽灵目前没有
                Apple 付费开发者签名，从网上下载后需要手动允许一次。
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-amber-300/25 bg-black/25 p-4">
              <p className="text-[14px] font-bold text-white">
                方法一（最简单）：右键打开
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] font-medium text-amber-50">
                <li>在 Finder 找到「小幽灵.app」</li>
                <li>
                  <span className="font-bold text-white">Control + 点击</span>
                  或右键 → 选「打开」
                </li>
                <li>弹窗里再点一次「打开」</li>
              </ol>
            </div>

            <div className="rounded-xl border border-amber-300/25 bg-black/25 p-4">
              <p className="text-[14px] font-bold text-white">方法二：终端命令</p>
              <p className="mt-2 text-[13px] font-medium text-amber-100/90">
                已拖到「应用程序」后，复制下面整行到「终端」回车：
              </p>
              <code className="mt-2 block overflow-x-auto rounded-lg bg-zinc-950 px-3 py-2.5 text-[13px] font-semibold text-emerald-300">
                xattr -cr &quot;/Applications/小幽灵.app&quot; &amp;&amp; open
                &quot;/Applications/小幽灵.app&quot;
              </code>
              <p className="mt-2 text-[12px] font-medium text-amber-200/80">
                若还在「下载」里：把路径改成 ~/Downloads/小幽灵.app
              </p>
            </div>

            <div className="rounded-xl border border-amber-300/25 bg-black/25 p-4">
              <p className="text-[14px] font-bold text-white">方法三：系统设置</p>
              <p className="mt-2 text-[14px] font-medium text-amber-50">
                先双击尝试打开一次 →「系统设置 → 隐私与安全性」→ 向下找到
                <span className="font-bold text-white">仍要打开</span>
              </p>
            </div>
          </div>

          <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-amber-100/90">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            应用源码可自查，仅连接 Groq 聊天，不读取系统敏感文件。
          </p>
        </section>

        <section className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
          <h2 className="text-[17px] font-bold text-white">安装步骤</h2>
          <ol className="list-decimal space-y-3 pl-5 text-[15px] font-medium leading-relaxed text-zinc-100">
            <li>下载 zip 并解压，得到「小幽灵.app」和「安装说明.txt」</li>
            <li>把 app 拖到「应用程序」文件夹</li>
            <li>按上方黄色提示完成首次打开</li>
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
