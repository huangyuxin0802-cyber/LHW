export default function Main({ title, description, children }) {
  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-y-auto bg-zinc-950">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-white/[0.02] blur-3xl"
      />

      {(title || description) && (
        <header className="relative border-b border-white/[0.06] bg-zinc-950/80 px-8 py-6 backdrop-blur-xl">
          {title && (
            <h1 className="text-[28px] font-extralight tracking-tight text-white">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-1 text-[15px] text-zinc-400">{description}</p>
          )}
        </header>
      )}

      <div className="relative flex-1 px-8 py-8">{children}</div>
    </main>
  );
}
