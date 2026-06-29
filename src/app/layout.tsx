"use client";

import { useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, Layout, Button, Avatar, Dropdown, Space, Tooltip } from "antd";
import {
  SettingOutlined,
  PictureOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  GithubOutlined,
  SunOutlined,
  MoonOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import SettingsModal from "@/components/SettingsModal";
import HistoryModal from "@/components/HistoryModal";
import SessionProvider from "@/components/SessionProvider";
import { AuthProvider } from "@/components/AuthContext";
import { ThemeProvider, useTheme } from "@/components/ThemeContext";
import { theme as antTheme } from "antd";

const { Content } = Layout;

const NAV_ITEMS = [
  { href: "/", label: "生图", icon: <PictureOutlined /> },
  { href: "/xhs", label: "小红书", icon: <AppstoreOutlined /> },
  { href: "/infographic", label: "信息图", icon: <BarChartOutlined /> },
  { href: "/gallery", label: "图库", icon: <FileImageOutlined /> },
  { href: "/records", label: "记录", icon: <HistoryOutlined /> },
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

  return (
    <>
      <header
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 52,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left: Logo + Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              marginRight: 12,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PictureOutlined style={{ color: "#fff", fontSize: 14 }} />
            </div>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
              }}
            >
              ImageGate
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Tooltip title={theme === "dark" ? "浅色模式" : "深色模式"}>
            <Button
              icon={theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
              type="text"
              size="small"
              style={{ color: "var(--text-muted)" }}
              onClick={toggleTheme}
            />
          </Tooltip>
          <Tooltip title="历史记录">
            <Button
              icon={<HistoryOutlined />}
              type="text"
              size="small"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setHistoryOpen(true)}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button
              icon={<SettingOutlined />}
              type="text"
              size="small"
              style={{ color: "var(--text-muted)" }}
              onClick={() => setSettingsOpen(true)}
            />
          </Tooltip>

          {status === "loading" ? (
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: "var(--bg-elevated)" }}
              size={28}
            />
          ) : session?.user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                src={user?.avatarUrl}
                icon={<UserOutlined />}
                style={{
                  cursor: "pointer",
                  backgroundColor: "var(--accent-primary)",
                  marginLeft: 4,
                }}
                size={28}
              />
            </Dropdown>
          ) : (
            <Link href="/login">
              <Button
                type="primary"
                size="small"
                style={{ borderRadius: 7, marginLeft: 4, fontSize: 13 }}
              >
                登录
              </Button>
            </Link>
          )}
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}

const DARK_TOKENS = {
  colorPrimary: "#8b5cf6",
  borderRadius: 10,
  colorBgContainer: "#13131f",
  colorBgElevated: "#1a1a2e",
  colorBgLayout: "#0c0c14",
  colorBorder: "rgba(255, 255, 255, 0.06)",
  colorText: "#eaeaef",
  colorTextSecondary: "#9898a8",
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const LIGHT_TOKENS = {
  colorPrimary: "#8b5cf6",
  borderRadius: 10,
  colorBgContainer: "#ffffff",
  colorBgElevated: "#f3f4f6",
  colorBgLayout: "#f9fafb",
  colorBorder: "rgba(0, 0, 0, 0.06)",
  colorText: "#111827",
  colorTextSecondary: "#6b7280",
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
        <a
          href="#main-content"
          className="sr-only"
          style={{ position: "absolute", top: "-100%" }}
        >
          跳到主要内容
        </a>
        <Layout style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
          <div className="mesh-bg" />
          <AppHeader />
          <Content
            id="main-content"
            style={{ padding: 0, position: "relative", zIndex: 1 }}
            tabIndex={-1}
          >
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
              <ThemeAwareProviders>{children}</ThemeAwareProviders>
            </AntdRegistry>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
