import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GhostPet from "@/components/GhostPet";
import { PetProvider } from "@/components/PetProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LHW",
  description: "简洁、安全的账号系统",
};

const themeScript = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    if (theme === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <PetProvider>
            {children}
            <GhostPet />
          </PetProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
