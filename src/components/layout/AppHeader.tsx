"use client";

import { useState, useEffect } from "react";
import { Button, Avatar, Dropdown, Space, Tooltip } from "antd";
import {
  SettingOutlined,
  PictureOutlined,
  HistoryOutlined,
  AppstoreOutlined,
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
import styles from "./AppHeader.module.css";

const NAV_ITEMS = [
  { href: "/", label: "生图", icon: <PictureOutlined /> },
  { href: "/gallery", label: "图库", icon: <AppstoreOutlined /> },
  { href: "/records", label: "记录", icon: <HistoryOutlined /> },
];

export function AppHeader() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Listen for external "open-settings" event (from AuthModal)
  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener("open-settings", handler);
    return () => window.removeEventListener("open-settings", handler);
  }, []);

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
      style: { opacity: 0.7 },
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
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.logoLink}>
            <div className={styles.logoIcon}>
              <PictureOutlined style={{ color: "#fff", fontSize: 14 }} />
            </div>
            <span className={styles.logoText}>ImageGate</span>
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

        <div className={styles.headerRight}>
          <Tooltip title={theme === "dark" ? "浅色模式" : "深色模式"}>
            <Button
              icon={theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
              type="text"
              size="small"
              className={styles.headerBtn}
              onClick={toggleTheme}
            />
          </Tooltip>
          <Tooltip title="历史记录">
            <Button
              icon={<HistoryOutlined />}
              type="text"
              size="small"
              className={styles.headerBtn}
              onClick={() => setHistoryOpen(true)}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button
              icon={<SettingOutlined />}
              type="text"
              size="small"
              className={styles.headerBtn}
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
                className={styles.avatarUser}
                size={28}
              />
            </Dropdown>
          ) : (
            <Link href="/login">
              <Button type="primary" size="small" className={styles.loginBtn}>
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
