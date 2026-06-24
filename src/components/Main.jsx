import { ui } from "@/lib/ui";

export default function Main({ title, description, children }) {
  return (
    <main className={`relative flex min-h-full flex-1 flex-col overflow-y-auto ${ui.main}`}>
      <div aria-hidden className={`absolute ${ui.pageGlowRight}`} />

      {(title || description) && (
        <header
          className={`relative border-b px-8 py-6 backdrop-blur-xl ${ui.mainHeader}`}
        >
          {title && (
            <h1 className={`text-[28px] font-extralight tracking-tight ${ui.mainTitle}`}>
              {title}
            </h1>
          )}
          {description && (
            <p className={`mt-1 text-[15px] ${ui.mainDesc}`}>{description}</p>
          )}
        </header>
      )}

      <div className="relative flex-1 px-8 py-8">{children}</div>
    </main>
  );
}
