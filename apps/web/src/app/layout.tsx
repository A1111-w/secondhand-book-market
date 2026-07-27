import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./components/app-shell";
import { SessionProvider } from "./components/session-provider";

export const metadata: Metadata = {
  title: {
    default: "华立校园市集",
    template: "%s | 华立校园市集",
  },
  description: "广州华立学院校内闲置物品与二手书交易平台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const paperSiteUrl = process.env.PAPER_SITE_URL || process.env.NEXT_PUBLIC_PAPER_SITE_URL || "http://localhost:3001";
  return (
    <html lang="zh-CN">
      <body>
        <SessionProvider>
          <AppShell paperSiteUrl={paperSiteUrl}>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
