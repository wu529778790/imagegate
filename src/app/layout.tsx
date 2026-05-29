"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, Layout, Menu, Typography } from "antd";
import {
  HomeOutlined,
  PictureOutlined,
  KeyOutlined,
  HistoryOutlined,
  SettingOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: "/", icon: <HomeOutlined />, label: <Link href="/">仪表盘</Link> },
  { key: "/generate", icon: <PictureOutlined />, label: <Link href="/generate">生成图片</Link> },
  { key: "/xhs", icon: <SmileOutlined />, label: <Link href="/xhs">小红书图片</Link> },
  { key: "/keys", icon: <KeyOutlined />, label: <Link href="/keys">API 密钥</Link> },
  { key: "/records", icon: <HistoryOutlined />, label: <Link href="/records">生成记录</Link> },
  { key: "/settings", icon: <SettingOutlined />, label: <Link href="/settings">设置</Link> },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              },
              components: {
                Layout: {
                  siderBg: "#1e1b4b",
                  triggerBg: "#312e81",
                },
                Menu: {
                  darkItemBg: "#1e1b4b",
                  darkSubMenuItemBg: "#1e1b4b",
                  darkItemSelectedBg: "#4f46e5",
                  darkItemHoverBg: "#312e81",
                },
              },
            }}
          >
            <Layout style={{ minHeight: "100vh" }}>
              <Sider
                breakpoint="lg"
                collapsedWidth="0"
                width={220}
                style={{
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    height: 64,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
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
                  <Text strong style={{ color: "#fff", fontSize: 18, letterSpacing: -0.5 }}>
                    BaoyuImages
                  </Text>
                </div>
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={[pathname]}
                  items={menuItems}
                  style={{ borderRight: "none", padding: "8px 0" }}
                />
              </Sider>
              <Content
                style={{
                  margin: 0,
                  padding: 32,
                  background: "#f8fafc",
                  overflow: "auto",
                }}
              >
                {children}
              </Content>
            </Layout>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
