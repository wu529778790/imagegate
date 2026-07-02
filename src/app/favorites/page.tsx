"use client";

import React, { useEffect, useMemo } from "react";
import { Button, App, Tabs } from "antd";
import { PlusOutlined, PictureOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/AuthContext";
import {
  HeaderSection,
  EmptyState,
  EmptyStates,
} from "@/components/ui";
import { PageLayout } from "@/components/layout/PageLayout";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useFavoriteCollections } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

export default function FavoritesPage() {
  const { message } = App.useApp();
  const { data: session, status } = useSession();
  const authModal = useAuthModal();

  const { data, mutate } = useFavoriteCollections();
  const collections = useFavoritesStore((s) => s.collections);
  const active = useFavoritesStore((s) => s.activeCollection);
  const setActive = useFavoritesStore((s) => s.setActiveCollection);
  const setCollections = useFavoritesStore((s) => s.setCollections);

  useEffect(() => {
    if (data?.collections) {
      const cols = data.collections.length ? data.collections : ["默认"];
      setCollections(cols);
    }
  }, [data?.collections, setCollections]);

  const tabItems = useMemo(
    () => collections.map((col) => ({ key: col, label: col })),
    [collections],
  );

  if (status === "unauthenticated") {
    return (
      <PageLayout>
        <EmptyState
          {...EmptyStates.loginRequired}
          action={<Button type="primary" onClick={() => authModal.requireAuth({ action: "favorites" })}>立即登录</Button>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <HeaderSection
        title="我的收藏"
        icon={<PictureOutlined />}
        actions={
          <Button
            icon={<PlusOutlined />}
            onClick={async () => {
              const name = window.prompt("请输入收藏夹名称：")?.trim();
              if (!name) return;
              await apiClient.post("/api/favorites", { name });
              await mutate();
            }}
          >
            新建收藏夹
          </Button>
        }
      />

      <Tabs
        activeKey={active}
        items={tabItems}
        onChange={(key) => setActive(key)}
        type="card"
      />

      <div style={{ padding: "24px 0", color: "var(--text-muted)" }}>
        收藏夹内容请在相册中星标图片后查看（功能建设中 🚧）
      </div>
    </PageLayout>
  );
}
