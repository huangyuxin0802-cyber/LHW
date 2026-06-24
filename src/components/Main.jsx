export default function Main({ title, description, children, theme = "light" }) {
  const isDark = theme === "dark";

  return (
    <main
      className={`flex min-h-full flex-1 flex-col overflow-y-auto ${
        isDark ? "bg-zinc-950" : "bg-[#f5f5f7]"
      }`}
    >
      {(title || description) && (
        <header
          className={`px-8 py-6 backdrop-blur-xl ${
            isDark
              ? "border-b border-white/[0.06] bg-zinc-950/80"
              : "border-b border-black/[0.06] bg-[#f5f5f7]/80"
          }`}
        >
          {title && (
            <h1
              className={`text-[28px] font-semibold tracking-tight ${
                isDark ? "font-extralight text-white" : "text-[#1d1d1f]"
              }`}
            >
              {isDark ? (
                <>
                  <span className="font-extralight">{title}</span>
                </>
              ) : (
                title
              )}
            </h1>
          )}
          {description && (
            <p
              className={`mt-1 text-[15px] ${
                isDark ? "text-zinc-400" : "text-[#86868b]"
              }`}
            >
              {description}
            </p>
          )}
        </header>
      )}

      <div className="flex-1 px-8 py-8">{children}</div>
    </main>
  );
}
