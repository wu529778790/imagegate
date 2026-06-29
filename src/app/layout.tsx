"use client";

import { useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, Layout, Button, Avatar, Dropdown, Space, Tooltip } from "antd";
import { SettingOutlined, PictureOutlined, HistoryOutlined, UserOutlined, LogoutOutlined, GithubOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import SettingsModal from "@/components/SettingsModal";
import HistoryModal from "@/components/HistoryModal";
import SessionProvider from "@/components/SessionProvider";
import { AuthProvider } from "@/components/AuthContext";
import { ThemeProvider, useTheme } from "@/components/ThemeContext";
import { theme as antTheme } from "antd";

const { Header, Content } = Layout;

const NAV_ITEMS = [
  { href: "/", label: "生图" },
  { href: "/xhs", label: "小红书" },
  { href: "/gallery", label: "图库" },
];

function AppHeader() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const user = session?.user as {
    id?: string;
    username?: string;
    avatarUrl?: string;
    name?: string | null;
  } | undefined;

  const userMenuItems = [
    {
      key: "profile",
      label: (
        <Space>
          <GithubOutlined />
          <span>{user?.username || user?.name || "GitHub"}</span>
        </Space>
      ),
      disabled: true,
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => signOut({ callbackUrl: "/login" }),
    },
  ];

  const themeIcon = theme === "dark" ? <SunOutlined /> : <MoonOutlined />;
  const themeTooltip = theme === "dark" ? "切换到浅色模式" : "切换到深色模式";

  return (
    <>
      <Header
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 56,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Logo + Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", marginRight: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(99, 102, 241, 0.3)",
              }}
            >
              <PictureOutlined style={{ color: "#fff", fontSize: 16 }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              ImageGate
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Tooltip title={themeTooltip}>
            <Button
              icon={themeIcon}
              type="text"
              style={{ color: "var(--text-muted)" }}
              onClick={toggleTheme}
            />
          </Tooltip>
          <Button
            icon={<HistoryOutlined />}
            type="text"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setHistoryOpen(true)}
          />
          <Button
            icon={<SettingOutlined />}
            type="text"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setSettingsOpen(true)}
          />

          {status === "loading" ? (
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: "var(--bg-elevated)" }} size={32} />
          ) : session?.user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                src={user?.avatarUrl}
                icon={<UserOutlined />}
                style={{ cursor: "pointer", backgroundColor: "#6366f1" }}
                size={32}
              />
            </Dropdown>
          ) : (
            <Link href="/login">
              <Button type="primary" size="small" style={{ borderRadius: 8 }}>
                登录
              </Button>
            </Link>
          )}
        </div>
      </Header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}

const DARK_TOKENS = {
  colorPrimary: "#6366f1",
  borderRadius: 12,
  colorBgContainer: "#141420",
  colorBgElevated: "#1e1e2e",
  colorBgLayout: "#0a0a0f",
  colorBorder: "rgba(255, 255, 255, 0.06)",
  colorText: "#e4e4e7",
  colorTextSecondary: "#71717a",
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const LIGHT_TOKENS = {
  colorPrimary: "#6366f1",
  borderRadius: 12,
  colorBgContainer: "#ffffff",
  colorBgElevated: "#f1f5f9",
  colorBgLayout: "#f8fafc",
  colorBorder: "rgba(0, 0, 0, 0.08)",
  colorText: "#0f172a",
  colorTextSecondary: "#475569",
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

function ThemeAwareProviders({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: isDark ? DARK_TOKENS : LIGHT_TOKENS,
      }}
    >
      <AuthProvider>
        <a href="#main-content" className="sr-only" style={{ position: 'absolute', top: '-100%' }}>
          跳到主要内容
        </a>
        <Layout style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
          <div className="mesh-bg" />
          <AppHeader />
          <Content id="main-content" style={{ padding: 0, position: "relative", zIndex: 1 }} tabIndex={-1}>
            {children}
          </Content>
        </Layout>
      </AuthProvider>
    </ConfigProvider>
  );
}

const ANTI_FOUC_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light') document.documentElement.classList.add('light');
    else if (t === 'dark') document.documentElement.classList.add('dark');
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.classList.add('light');
    else document.documentElement.classList.add('dark');
  } catch(e) { document.documentElement.classList.add('dark'); }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FOUC_SCRIPT }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0f" />
        <meta name="description" content="ImageGate - AI 图片生成服务" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0 }}>
        <SessionProvider>
          <ThemeProvider>
            <AntdRegistry>
              <ThemeAwareProviders>
                {children}
              </ThemeAwareProviders>
            </AntdRegistry>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
