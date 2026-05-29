"use client";

import { useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, Layout, Button, Typography } from "antd";
import { SettingOutlined, PictureOutlined } from "@ant-design/icons";
import Link from "next/link";
import SettingsModal from "@/components/SettingsModal";

const { Header, Content } = Layout;
const { Text } = Typography;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>
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
                <Button icon={<SettingOutlined />} type="text" style={{ color: "#64748b" }} onClick={() => setSettingsOpen(true)}>
                  设置
                </Button>
              </Header>
              <Content style={{ padding: 0 }}>
                {children}
              </Content>
            </Layout>
            <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
