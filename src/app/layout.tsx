import type { Metadata } from "next";
import { Inter } from "next/font/google";
import GlobalFloatingPet from "@/components/GlobalFloatingPet";
import TauriDesktopInit from "@/components/TauriDesktopInit";
import { LocaleProvider } from "@/components/LocaleProvider";
import { PetProvider } from "@/components/PetProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Desktop Pet",
  description: "栖息在你桌面上的电子宠物陪伴",
};

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
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <LocaleProvider>
            <PetProvider>
              <TauriDesktopInit />
              {children}
              <GlobalFloatingPet />
            </PetProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
