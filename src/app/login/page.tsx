"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Typography } from "antd";
import { GithubOutlined, PictureOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import styles from "./Login.module.css";

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
      <div className={styles.loadingWrapper}>
        <div className={styles.loadingText}>加载中...</div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={`glass ${styles.card}`}>
        <div className={styles.logo}>
          <PictureOutlined style={{ color: "#fff", fontSize: 22 }} />
        </div>

        <div className={styles.title}>ImageGate</div>
        <span className={styles.subtitle}>AI 图片生成服务</span>

        <Button
          type="primary"
          icon={<GithubOutlined />}
          size="large"
          block
          onClick={() => signIn("github", { callbackUrl: "/" })}
          className={styles.loginBtn}
        >
          使用 GitHub 登录
        </Button>

        <span className={styles.footer}>
          登录后可保存生成的图片到您的 GitHub 仓库
        </span>
      </div>
    </div>
  );
}
