"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Typography } from "antd";
import { GithubOutlined, PictureOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";

const { Text } = Typography;

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 52px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>加载中...</div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 52px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="glass"
        style={{
          padding: "40px 36px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <PictureOutlined style={{ color: "#fff", fontSize: 22 }} />
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 6,
            letterSpacing: "-0.03em",
          }}
        >
          ImageGate
        </div>
        <Text
          style={{
            color: "var(--text-muted)",
            fontSize: 13,
            display: "block",
            marginBottom: 28,
          }}
        >
          AI 图片生成服务
        </Text>

        <Button
          type="primary"
          icon={<GithubOutlined />}
          size="large"
          block
          onClick={() => signIn("github", { callbackUrl: "/" })}
          style={{ height: 44, borderRadius: 10, fontWeight: 600, fontSize: 14 }}
        >
          使用 GitHub 登录
        </Button>

        <Text
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            display: "block",
            marginTop: 16,
          }}
        >
          登录后可保存生成的图片到您的 GitHub 仓库
        </Text>
      </div>
    </div>
  );
}
