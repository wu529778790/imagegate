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

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  // 如果正在检查状态，显示加载中
  if (status === "loading") {
    return (
      <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#71717a" }}>加载中...</div>
        </div>
      </div>
    );
  }

  // 如果已登录，不显示内容（正在重定向）
  if (status === "authenticated") {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div className="glass" style={{ padding: "48px 40px", maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)",
          }}
        >
          <PictureOutlined style={{ color: "#fff", fontSize: 24 }} />
        </div>

        <div style={{ fontSize: 22, fontWeight: 700, color: "#e4e4e7", marginBottom: 8, letterSpacing: "-0.02em" }}>
          ImageGate
        </div>
        <Text style={{ color: "#71717a", fontSize: 14, display: "block", marginBottom: 32 }}>
          AI 图片生成服务
        </Text>

        <Button
          type="primary"
          icon={<GithubOutlined />}
          size="large"
          block
          onClick={() => signIn("github", { callbackUrl: "/" })}
          style={{ height: 48, borderRadius: 12, fontWeight: 600, fontSize: 15 }}
        >
          使用 GitHub 登录
        </Button>

        <Text style={{ color: "#52525b", fontSize: 12, display: "block", marginTop: 20 }}>
          登录后可保存生成的图片到您的 GitHub 仓库
        </Text>
      </div>
    </div>
  );
}
