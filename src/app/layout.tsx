/**
 * RootLayout — Server Component shell.
 *
 * No "use client" directive — this is a Server Component.
 * All client-side providers live in ClientProviders.
 * Font loaded via next/font/google (no external link blocking render).
 */

import { Inter } from "next/font/google";
import { ClientProviders } from "@/components/ClientProviders";
import { ANTI_FOUC_SCRIPT } from "@/components/layout/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f9fafb" />
        <meta name="description" content="ImageGate - AI 图片生成服务" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ margin: 0 }}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
