"use client";

import { useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, Layout, Button, Typography, Avatar, Dropdown, Space } from "antd";
import { SettingOutlined, PictureOutlined, HistoryOutlined, UserOutlined, LogoutOutlined, GithubOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import SettingsModal from "@/components/SettingsModal";
import HistoryModal from "@/components/HistoryModal";
import SessionProvider from "@/components/SessionProvider";

const { Header, Content } = Layout;
const { Text } = Typography;

function AppHeader() {
  const { data: session, status } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Access custom session properties
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
    <Header
      style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: 64,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PictureOutlined style={{ color: "#fff", fontSize: 18 }} />
          </div>
          <Text strong style={{ fontSize: 20, letterSpacing: -0.5, color: "#1e1b4b" }}>
            妙笔
          </Text>
        </Link>
        <Link href="/" style={{ color: "#64748b", fontSize: 14 }}>小红书</Link>
        <Link href="/infographic" style={{ color: "#64748b", fontSize: 14 }}>信息图</Link>
        <Link href="/gallery" style={{ color: "#64748b", fontSize: 14 }}>我的图片</Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button icon={<HistoryOutlined />} type="text" style={{ color: "#64748b" }} onClick={() => setHistoryOpen(true)}>
          历史
        </Button>
        <Button icon={<SettingOutlined />} type="text" style={{ color: "#64748b" }} onClick={() => setSettingsOpen(true)}>
          设置
        </Button>
        {status === "loading" ? (
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#e5e7eb" }} />
        ) : session?.user ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar
              src={user?.avatarUrl}
              icon={<UserOutlined />}
              style={{ cursor: "pointer", backgroundColor: "#4f46e5" }}
            />
          </Dropdown>
        ) : (
          <Link href="/login">
            <Button type="primary" size="small">
              登录
            </Button>
          </Link>
        )}
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </Header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>
        <SessionProvider>
          <AntdRegistry>
            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: "#4f46e5",
                  borderRadius: 10,
                  colorBgContainer: "#ffffff",
                },
              }}
            >
              <Layout style={{ minHeight: "100vh", background: "#f8fafc" }}>
                <AppHeader />
                <Content style={{ padding: 0 }}>
                  {children}
                </Content>
              </Layout>
            </ConfigProvider>
          </AntdRegistry>
        </SessionProvider>
      </body>
    </html>
  );
}
