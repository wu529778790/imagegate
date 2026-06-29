"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeContext";
import { AppHeader, ThemeAwareProviders, ANTI_FOUC_SCRIPT } from "@/components/layout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0c0c14" />
        <meta name="description" content="ImageGate - AI 图片生成服务" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0 }}>
        <SessionProvider>
          <ThemeProvider>
            <AntdRegistry>
              <div className="mesh-bg" />
              <AppHeader />
              <ThemeAwareProviders>{children}</ThemeAwareProviders>
            </AntdRegistry>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
