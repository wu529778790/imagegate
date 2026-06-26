"use client";

import { Button, Card, Typography } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";

const { Title, Text } = Typography;

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card
        style={{
          width: 400,
          textAlign: "center",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            🎨 妙笔
          </Title>
          <Text type="secondary">
            AI 图片生成服务
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<GithubOutlined />}
          onClick={() => signIn("github", { callbackUrl: "/" })}
          style={{
            width: "100%",
            height: 48,
            fontSize: 16,
            background: "#24292e",
            borderColor: "#24292e",
          }}
        >
          使用 GitHub 登录
        </Button>

        <div style={{ marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            登录后可保存生成的图片到您的 GitHub 仓库
          </Text>
        </div>
      </Card>
    </div>
  );
}
