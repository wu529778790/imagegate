"use client";

import React, { useCallback, useEffect, useMemo } from "react";
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
import { useFavorites, useFavoriteCollections } from "@/lib/api/hooks";
import { FavoriteCard } from "@/components/favorites/FavoriteCard";
import { apiClient } from "@/lib/api/client";

export default function FavoritesPage() {
  const { message } = App.useApp();
  const { data: session, status } = useSession();
  const authModal = useAuthModal();

  const collections = useFavoritesStore((s) => s.collections);
  const active = useFavoritesStore((s) => s.activeCollection);
  const setActive = useFavoritesStore((s) => s.setActiveCollection);
  const setCollections = useFavoritesStore((s) => s.setCollections);

  const { data, mutate } = useFavoriteCollections();
  const { data: favs } = useFavorites(active || null);

  const favoriteIds = useMemo(
    () => new Set((favs?.favorites ?? []).map((f) => f.record_id)),
    [favs?.favorites],
  );

  useEffect(() => {
    if (data?.collections) {
      const cols = data.collections.length ? data.collections : ["默认"];
      setCollections(cols);
    }
  }, [data?.collections, setCollections]);

  // When the active tab changes, push ids into the store for fast isFavorite checks
  useEffect(() => {
    useFavoritesStore.getState().setFavoriteIds(Array.from(favoriteIds));
  }, [favoriteIds]);

  const handleNew = useCallback(async () => {
    const name = window.prompt("请输入收藏夹名称：")?.trim();
    if (!name) return;
    await apiClient.post("/api/favorites", { name });
    await mutate();
  }, [mutate]);

  const handleRename = useCallback(
    async (oldName: string) => {
      const newName = window.prompt("重命名为：", oldName)?.trim();
      if (!newName || newName === oldName) return;
      await apiClient.post("/api/favorites", {
        action: "rename",
        oldName,
        newName,
      });
      await mutate();
    },
    [mutate],
  );

  const handleDeleteCollection = useCallback(
    async (name: string) => {
      if (!window.confirm(`确定删除收藏夹「${name}」？`)) return;
      await apiClient.post("/api/favorites", { action: "delete", name });
      await mutate();
    },
    [mutate],
  );

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
          <Button icon={<PlusOutlined />} onClick={handleNew}>
            新建收藏夹
          </Button>
        }
      />

      <Tabs
        activeKey={active}
        items={tabItems.map((t) => ({
          ...t,
          label: (
            <span
              onContextMenu={(e) => {
                e.preventDefault();
                const action = window.prompt(`收藏夹「${t.label}」操作：输入 rename 重命名，delete 删除`);
                if (action === "rename") handleRename(t.label as string);
                else if (action === "delete") handleDeleteCollection(t.label as string);
              }}
            >
              {t.label}
            </span>
          ),
        }))}
        onChange={(key) => setActive(key)}
        type="card"
      />

      {(favs?.favorites ?? []).length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
          在相册中点击星标即可将图片收藏至此
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            padding: "20px 0",
          }}
        >
          {favs?.favorites.map((fav) => (
            <FavoriteCard key={fav.id} recordId={fav.record_id} collection={active} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
