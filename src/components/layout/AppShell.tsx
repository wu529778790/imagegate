"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PictureOutlined,
  CloudOutlined,
  HeartOutlined,
  HistoryOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { useTheme } from "@/components/ThemeContext";
import { useSession } from "next-auth/react";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { href: "/", icon: PictureOutlined, label: "生图" },
  { href: "/gallery", icon: CloudOutlined, label: "相册" },
  { href: "/favorites", icon: HeartOutlined, label: "收藏" },
  { href: "/records", icon: HistoryOutlined, label: "记录" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { status } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandLogo}>IG</div>
          {!collapsed && <span className={styles.brandName}>ImageGate</span>}
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Tooltip key={item.href} title={collapsed ? item.label : undefined} placement="right">
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                >
                  <Icon className={styles.navIcon} />
                  {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Tooltip title={collapsed ? (theme === "dark" ? "暗色" : "亮色") : undefined} placement="right">
            <button
              className={styles.sidebarBtn}
              onClick={toggleTheme}
              aria-label="切换主题"
            >
              {theme === "dark" ? "🌙" : "🌞"}
            </button>
          </Tooltip>
          <Tooltip title={collapsed ? "收起" : undefined} placement="right">
            <button
              className={styles.sidebarBtn}
              onClick={() => setCollapsed((c) => !c)}
              aria-label="折叠侧栏"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarTitle}>
            {NAV_ITEMS.find((n) => (n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href)))?.label || "ImageGate"}
          </div>
          <div className={styles.topbarRight}>
            {status === "authenticated" && (
              <Link href="/settings" className={styles.topbarBtn}>
                <SettingOutlined />
              </Link>
            )}
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

/** Convenience export — just the content side of the shell (no sidebar) */
export function ShellContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
