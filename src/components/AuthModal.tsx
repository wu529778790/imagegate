"use client";

import { useEffect, useState, useCallback } from "react";
import { Modal, Button, Typography, Space, Divider, message, Spin } from "antd";
import { GithubOutlined, SettingOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useSession, signIn, signOut } from "next-auth/react";
import { motion } from "framer-motion";

const { Text, Title, Paragraph } = Typography;

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  /** 触发此弹窗的操作描述（用于引导文案） */
  action?: string;
  /** 登录/配置成功后的回调 */
  onSuccess?: () => void;
}

/**
 * 统一登录/配置弹窗
 *
 * 状态流转：
 * 1. 未登录 → 显示登录按钮
 * 2. 已登录未配置 → 显示配置引导
 * 3. 已登录已配置 → 关闭弹窗（或显示完成状态）
 */
export default function AuthModal({ open, onClose, action, onSuccess }: AuthModalProps) {
  const { data: session, status, update } = useSession();

  // Extend session.user type with custom properties added in auth.ts session callback
  const user = session?.user as {
    id?: string;
    username?: string;
    avatarUrl?: string;
    name?: string | null;
  } | undefined;

  const [loading, setLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<{
    hasConfig: boolean;
    checking: boolean;
  }>({ hasConfig: false, checking: false });

  // 检查 API 配置状态
  const checkConfig = useCallback(async () => {
    if (!user) {
      setConfigStatus({ hasConfig: false, checking: false });
      return;
    }

    setConfigStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        // 检查是否有至少一个 provider 配置了 API Key
        const hasOpenAI = data.openai_api_key && data.openai_api_key.trim().length > 0;
        const hasAnthropic = data.anthropic_api_key && data.anthropic_api_key.trim().length > 0;
        const hasConfig = hasOpenAI || hasAnthropic;
        setConfigStatus({ hasConfig, checking: false });

        // 如果已配置，触发成功回调
        if (hasConfig && onSuccess) {
          onSuccess();
        }
      } else {
        setConfigStatus({ hasConfig: false, checking: false });
      }
    } catch {
      setConfigStatus({ hasConfig: false, checking: false });
    }
  }, [user, onSuccess]);

  // 监听弹窗打开状态和 session 变化
  useEffect(() => {
    if (open && status === "authenticated") {
      // 使用 requestAnimationFrame 避免在 effect 中同步调用 setState
      const timer = requestAnimationFrame(() => {
        checkConfig();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [open, status, checkConfig]);

  // 重置状态
  useEffect(() => {
    if (!open) {
      // 使用 requestAnimationFrame 避免在 effect 中同步调用 setState
      const timer = requestAnimationFrame(() => {
        setConfigStatus({ hasConfig: false, checking: false });
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [open]);

  // GitHub 登录
  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      await signIn("github", { callbackUrl: window.location.href });
    } catch (error) {
      console.error("Login failed:", error);
      message.error("登录失败，请重试");
      setLoading(false);
    }
  };

  // 退出登录
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
      setLoading(false);
    }
  };

  // 前往配置页面
  const handleGoToSettings = () => {
    onClose();
    // 延迟一点，让弹窗动画完成
    setTimeout(() => {
      window.location.href = "/settings";
    }, 300);
  };

  // 关闭弹窗
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // 根据状态确定显示内容
  const getContent = () => {
    // 状态 1: 加载中
    if (status === "loading" || configStatus.checking) {
      return (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: "block", marginTop: 16 }}>
            检查状态中...
          </Text>
        </div>
      );
    }

    // 状态 2: 未登录
    if (!session?.user) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)",
              }}
            >
              <GithubOutlined style={{ color: "#fff", fontSize: 28 }} />
            </div>

            <Title level={3} style={{ color: "#e4e4e7", marginBottom: 8 }}>
              登录以继续
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {action ? (
                <>
                  您需要登录才能<strong>{action}</strong>
                </>
              ) : (
                <>
                  登录后可保存生成的图片到您的 GitHub 仓库
                </>
              )}
            </Paragraph>
          </div>

          <Button
            type="primary"
            icon={<GithubOutlined />}
            size="large"
            block
            onClick={handleGitHubLogin}
            loading={loading}
            style={{
              height: 48,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 16,
            }}
          >
            使用 GitHub 登录
          </Button>

          <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block" }}>
            我们只获取您的基本公开信息，不会访问您的私有仓库
          </Text>
        </motion.div>
      );
    }

    // 状态 3: 已登录但未配置
    if (user && !configStatus.hasConfig) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 0 30px rgba(217, 119, 6, 0.3)",
              }}
            >
              <SettingOutlined style={{ color: "#fff", fontSize: 28 }} />
            </div>

            <Title level={3} style={{ color: "#e4e4e7", marginBottom: 8 }}>
              需要配置 API
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              您好，<strong>@{user.username || user.name}</strong>！
              <br />
              {action ? (
                <>
                  要<strong>{action}</strong>，需要先配置至少一个图片生成服务的 API Key
                </>
              ) : (
                <>
                  要开始生成图片，需要先配置至少一个图片生成服务的 API Key
                </>
              )}
            </Paragraph>
          </div>

          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <div
              style={{
                padding: 16,
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <ExclamationCircleOutlined style={{ color: "#818cf8" }} />
                <Text strong style={{ color: "#e4e4e7" }}>
                  支持的配置
                </Text>
              </div>
              <ul style={{ color: "#71717a", fontSize: 14, margin: 0, paddingLeft: 20 }}>
                <li>OpenAI 兼容（支持 OpenAI、通义、智谱、豆包、Google 等）</li>
                <li>Anthropic（Claude 系列模型）</li>
              </ul>
            </div>

            <Button
              type="primary"
              icon={<SettingOutlined />}
              size="large"
              block
              onClick={handleGoToSettings}
              loading={loading}
              style={{
                height: 48,
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              前往配置
            </Button>

            <Button
              size="small"
              onClick={handleLogout}
              loading={loading}
              style={{ width: "100%" }}
            >
              退出登录
            </Button>
          </Space>
        </motion.div>
      );
    }

    // 状态 4: 已登录已配置（理论上不会显示，但作为兜底）
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <CheckCircleOutlined style={{ fontSize: 48, color: "#22c55e", marginBottom: 16 }} />
        <Title level={4} style={{ color: "#e4e4e7" }}>
          您已准备就绪
        </Title>
        <Button onClick={handleClose}>关闭</Button>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={420}
      centered
      closable={!loading}
      maskClosable={!loading}
      destroyOnClose
      styles={{
        body: { padding: "32px 24px" },
        mask: { backdropFilter: "blur(8px)" },
        wrapper: { zIndex: 1100 },
      }}
    >
      {getContent()}
    </Modal>
  );
}
