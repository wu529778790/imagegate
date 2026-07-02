"use client";

import React, { useMemo } from "react";
import { Button, Checkbox, Popconfirm, Tag, App } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useFilteredRecords } from "@/lib/api/hooks";
import { useGenerateStore } from "@/stores/generate-store";
import { timeAgo, formatMs } from "@/lib/format";
import { ProviderBadge } from "@/components/ui";
import styles from "./HistoryStrip.module.css";

interface HistoryStripProps {
  activeLogId: string | null;
  selectedLogIds: string[];
  onSelectToggle: (id: string, checked: boolean) => void;
  onPreview: (log: {
    id: string;
    prompt: string;
    provider: string;
    model?: string;
    ar: string;
    quality: string;
    images: Array<{ dataUrl: string }>;
  }) => void;
  onNewSession: () => void;
  onDeleteSelected: () => void;
}

export function HistoryStrip({
  activeLogId,
  selectedLogIds,
  onSelectToggle,
  onPreview,
  onNewSession,
  onDeleteSelected,
}: HistoryStripProps) {
  const { data } = useFilteredRecords({ pageSize: 50, page: 1 });
  const setProvider = useGenerateStore((s) => s.setProvider);
  const setModel = useGenerateStore((s) => s.setModel);
  const setAr = useGenerateStore((s) => s.setAr);
  const setQuality = useGenerateStore((s) => s.setQuality);
  const setPrompt = useGenerateStore((s) => s.setPrompt);

  const records = useMemo(() => data?.records ?? [], [data?.records]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>生成记录</span>
        <Tag className={styles.count}>{records.length}</Tag>
      </div>

      <div className={styles.toolbar}>
        <Button size="small" icon={<PlusOutlined />} onClick={onNewSession}>
          新建
        </Button>
        <Button
          size="small"
          icon={<PlusOutlined style={{ transform: "rotate(45deg)" }} />}
          disabled={!records.length}
          onClick={() => {
            /* toggleSelectAll placeholder — parent passes setAll */
          }}
        >
          {selectedLogIds.length === records.length && records.length > 0 ? "取消" : "全选"}
        </Button>
        <Popconfirm
          title={`确定删除选中的 ${selectedLogIds.length} 条记录？`}
          onConfirm={onDeleteSelected}
          okText="删除"
          cancelText="取消"
        >
          <Button size="small" danger icon={<DeleteOutlined />} disabled={!selectedLogIds.length}>
            删除
          </Button>
        </Popconfirm>
      </div>

      <div className={styles.list}>
        {records.map((rec) => {
          const id = String(rec.id);
          const isActive = id === activeLogId;
          return (
            <button
              key={id}
              className={`${styles.entry} ${isActive ? styles.entryActive : ""}`}
              onClick={() => {
                setProvider(rec.provider);
                if (rec.model) setModel(rec.model);
                if ((rec as unknown as { ar?: string }).ar) setAr((rec as unknown as { ar: string }).ar as never);
                if ((rec as unknown as { quality?: string }).quality) setQuality((rec as unknown as { quality: string }).quality as never);
                setPrompt(rec.prompt || "");
                onPreview({
                  id,
                  prompt: rec.prompt || "",
                  provider: rec.provider,
                  model: rec.model || undefined,
                  ar: (rec as unknown as { ar?: string }).ar || "1:1",
                  quality: (rec as unknown as { quality?: string }).quality || "2k",
                  images: [],
                });
              }}
            >
              <div className={styles.entryInfo}>
                <Checkbox
                  checked={selectedLogIds.includes(id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onSelectToggle(id, e.target.checked)}
                  className={styles.checkbox}
                />
                <div className={styles.entryText}>
                  <div className={styles.entryTitle} title={rec.prompt || ""}>
                    {rec.prompt?.slice(0, 40) || "无提示词"}
                    {rec.prompt && rec.prompt.length > 40 && "…"}
                  </div>
                </div>
              </div>
              <div className={styles.entryMeta}>
                <ProviderBadge provider={rec.provider} size="small" />
                <span className={styles.entryTime}>{timeAgo(rec.created_at)}</span>
                {rec.duration_ms != null && (
                  <span className={styles.entryDuration}>{formatMs(rec.duration_ms)}</span>
                )}
              </div>
            </button>
          );
        })}
        {!records.length && <div className={styles.empty}>暂无生成记录</div>}
      </div>
    </aside>
  );
}
