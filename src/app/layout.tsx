"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, Layout, Menu } from "antd";
import {
  HomeOutlined,
  PictureOutlined,
  KeyOutlined,
  HistoryOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "/", icon: <HomeOutlined />, label: <Link href="/">Dashboard</Link> },
  { key: "/generate", icon: <PictureOutlined />, label: <Link href="/generate">Generate</Link> },
  { key: "/keys", icon: <KeyOutlined />, label: <Link href="/keys">API Keys</Link> },
  { key: "/records", icon: <HistoryOutlined />, label: <Link href="/records">Records</Link> },
  { key: "/settings", icon: <SettingOutlined />, label: <Link href="/settings">Settings</Link> },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: { colorPrimary: "#1677ff" },
            }}
          >
            <Layout style={{ minHeight: "100vh" }}>
              <Sider breakpoint="lg" collapsedWidth="0">
                <div style={{ height: 32, margin: 16, color: "#fff", fontSize: 18, fontWeight: "bold", textAlign: "center" }}>
                  Image API
                </div>
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={[pathname]}
                  items={menuItems}
                />
              </Sider>
              <Content style={{ margin: 24, padding: 24, background: "#fff", borderRadius: 8, overflow: "auto" }}>
                {children}
              </Content>
            </Layout>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
