export default function Main({ title, description, children }) {
  return (
    <main className="flex min-h-full flex-1 flex-col overflow-y-auto bg-[#f5f5f7]">
      {(title || description) && (
        <header className="border-b border-black/[0.06] bg-[#f5f5f7]/80 px-8 py-6 backdrop-blur-xl">
          {title && (
            <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-1 text-[15px] text-[#86868b]">{description}</p>
          )}
        </header>
      )}

      <div className="flex-1 px-8 py-8">{children}</div>
    </main>
  );
}
