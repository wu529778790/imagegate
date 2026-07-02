"use client";

import React, { useEffect, useState } from "react";
import { Tag, App } from "antd";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api/client";
import { ImageCard, ProviderBadge, StatusBadge } from "@/components/ui";
import styles from "./FavoriteCard.module.css";

interface FavoriteCardProps {
  recordId: number;
  collection: string;
}

interface RecordDetail {
  id: number;
  prompt: string | null;
  provider: string;
  model: string | null;
  status: string;
  duration_ms: number | null;
  imageUrl: string | null;
  created_at: string;
}

export function FavoriteCard({ recordId, collection }: FavoriteCardProps) {
  const { message } = App.useApp();
  const { data, isLoading } = useSWR<RecordDetail>(`/api/records/${recordId}/detail`, swrFetcher);
  const [removed, setRemoved] = useState(false);

  if (removed) return null;
  if (isLoading || !data) {
    return (
      <div className={styles.skeleton}>
        <div className="shimmer" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <ImageCard
      src={data.imageUrl || ""}
      alt={data.prompt || "已收藏图片"}
      showDownload={!!data.imageUrl}
      statusBadge={<StatusBadge status={data.status} />}
      metadata={
        <div className={styles.metadata}>
          <div className={styles.promptRow} title={data.prompt || ""}>
            {data.prompt?.substring(0, 60) || "无提示词"}
            {data.prompt && data.prompt.length > 60 && "…"}
          </div>
          <div className={styles.metaRow}>
            <ProviderBadge provider={data.provider} size="small" />
            {data.duration_ms != null && (
              <Tag className={styles.tag}>
                {data.duration_ms >= 1000
                  ? `${(data.duration_ms / 1000).toFixed(1)}s`
                  : `${Math.round(data.duration_ms)}ms`}
              </Tag>
            )}
          </div>
        </div>
      }
    />
  );
}
