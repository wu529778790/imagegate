"use client";

import { useState } from "react";
import { Button, Avatar, Dropdown, Space, Tooltip } from "antd";
import {
  SettingOutlined,
  PictureOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  GithubOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import SettingsModal from "@/components/SettingsModal";
import HistoryModal from "@/components/HistoryModal";
import { useTheme } from "@/components/ThemeContext";

const NAV_ITEMS = [
  { href: "/", label: "生图", icon: <PictureOutlined /> },
  { href: "/xhs", label: "小红书", icon: <PictureOutlined /> },
  { href: "/infographic", label: "信息图", icon: <PictureOutlined /> },
  { href: "/gallery", label: "图库", icon: <PictureOutlined /> },
  { href: "/records", label: "记录", icon: <HistoryOutlined /> },
];

export function AppHeader() {
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
      <header className="app-header">
        {/* Left: Logo + Nav */}
        <div className="app-header__left">
          <Link href="/" className="app-logo">
            <div className="app-logo__icon">
              <PictureOutlined style={{ color: "#fff", fontSize: 14 }} />
            </div>
            <span className="app-logo__text">ImageGate</span>
          </Link>

          <nav className="app-nav">
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
        <div className="app-header__right">
          <Tooltip title={theme === "dark" ? "浅色模式" : "深色模式"}>
            <Button
              icon={theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
              type="text"
              size="small"
              className="header-btn"
              onClick={toggleTheme}
            />
          </Tooltip>
          <Tooltip title="历史记录">
            <Button
              icon={<HistoryOutlined />}
              type="text"
              size="small"
              className="header-btn"
              onClick={() => setHistoryOpen(true)}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button
              icon={<SettingOutlined />}
              type="text"
              size="small"
              className="header-btn"
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
                className="avatar-user"
                size={28}
              />
            </Dropdown>
          ) : (
            <Link href="/login">
              <Button type="primary" size="small" className="login-btn">
                登录
              </Button>
            </Link>
          )}
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <style jsx>{`
        .app-header {
          background: var(--glass-bg);
          backdrop-filter: blur(20px) saturate(1.2);
          -webkit-backdrop-filter: blur(20px) saturate(1.2);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 52px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .app-header__left {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .app-header__right {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        /* Logo */
        .app-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-right: 12px;
        }
        .app-logo__icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .app-logo__text {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }

        /* Buttons */
        .header-btn {
          color: var(--text-muted) !important;
        }
        .avatar-user {
          cursor: pointer;
          background-color: var(--accent-primary) !important;
          margin-left: 4px;
        }
        .login-btn {
          border-radius: 7px !important;
          margin-left: 4px;
          font-size: 13px !important;
        }
      `}</style>
    </>
  );
}
