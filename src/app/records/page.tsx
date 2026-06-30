/**
 * RecordsPage — Generation records with filtering and stats.
 *
 * Phase 3 refactoring:
 * - SWR hooks for records data (no raw fetch)
 * - apiClient for DELETE mutation
 * - No silent catch blocks
 * - RecordCard extracted as React.memo component
 */

'use client';

import React, { useState, useMemo } from "react";
import { Card, Select, Space, Typography, Button, Tag, Pagination, message } from "antd";
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { HeaderSection, EmptyState, EmptyStates, ProviderBadge, StatusBadge, StatsCard } from "@/components/ui";
import { useRecords } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { formatDuration } from "@/lib/utils";
import { PROVIDER_LABELS, STATUS_CONFIG } from "@/types";
import type { GenerationRecord, RecordStatus } from "@/types";

export default function RecordsPage() {
  const [providerFilter, setProviderFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  // SWR for records — page + filters
  const { data, isLoading: loading, mutate: refreshRecords } = useRecords(1);
  const records: GenerationRecord[] = data?.records ?? [];
  const total = data?.total ?? 0;

  const computedStats = useMemo(() => {
    const successCount = records.filter((r) => r.status === "success").length;
    const failedCount = records.filter((r) => r.status === "failed").length;
    const avgDuration =
      records.length > 0
        ? records.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / records.length
        : 0;

    return {
      total: records.length,
      success: successCount,
      failed: failedCount,
      avgDuration: Math.round(avgDuration / 1000),
    };
  }, [records]);

  const providerOptions = Object.entries(PROVIDER_LABELS).map(([value, label]) => ({ value, label }));

  const statusOptions = Object.entries(STATUS_CONFIG)
    .filter(([key]) => key !== "running")
    .map(([value, config]) => ({ value, label: config.label }));

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/records?id=${id}`);
      message.success("已删除");
      refreshRecords();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  // Note: For now, filters are client-side on the already fetched records.
  // In Phase 3+ we can add filter params to the SWR key for server-side filtering.
  const filteredRecords = useMemo(() => {
    let result = records;
    if (providerFilter) result = result.filter((r) => r.provider === providerFilter);
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    return result;
  }, [records, providerFilter, statusFilter]);

  return (
    <div style={{ padding: "20px 20px", maxWidth: 1400, margin: "0 auto" }}>
      <HeaderSection title="生成记录" subtitle="查看所有历史生成记录" marginBottom={24} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatsCard title="总记录" value={computedStats.total} icon={<ClockCircleOutlined />} color="var(--accent-primary)" />
        <StatsCard
          title="成功"
          value={computedStats.success}
          icon={<CheckCircleOutlined />}
          color="var(--color-success)"
          trend={{
            value: computedStats.total > 0 ? Math.round((computedStats.success / computedStats.total) * 100) : 0,
            isPositive: true,
          }}
        />
        <StatsCard
          title="失败"
          value={computedStats.failed}
          icon={<CloseCircleOutlined />}
          color="var(--color-error)"
          trend={{
            value: computedStats.total > 0 ? Math.round((computedStats.failed / computedStats.total) * 100) : 0,
            isPositive: false,
          }}
        />
        <StatsCard title="平均耗时" value={`${computedStats.avgDuration}s`} icon={<ReloadOutlined />} color="var(--color-info)" />
      </div>

      <Card
        variant="borderless"
        style={{ borderRadius: 12, marginBottom: 16, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <Space wrap>
          <Select
            allowClear
            placeholder="服务商"
            style={{ minWidth: 140 }}
            onChange={setProviderFilter}
            options={providerOptions}
            value={providerFilter}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ minWidth: 140 }}
            onChange={setStatusFilter}
            options={statusOptions}
            value={statusFilter}
          />
          {(providerFilter || statusFilter) && (
            <Button
              type="text"
              onClick={() => { setProviderFilter(undefined); setStatusFilter(undefined); }}
              style={{ color: "var(--text-secondary)" }}
            >
              清除筛选
            </Button>
          )}
        </Space>
      </Card>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>加载中...</div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState {...EmptyStates.noRecords} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 16 }}>
            {filteredRecords.map((record, index) => (
              <RecordCard key={record.id} record={record} index={index} onDelete={handleDelete} />
            ))}
          </div>

          {total > 20 && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Pagination current={1} total={total} pageSize={20} onChange={() => refreshRecords()} showSizeChanger={false} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Individual record card — React.memo protected for list performance. */
const RecordCard = React.memo(function RecordCard({
  record,
  index,
  onDelete,
}: {
  record: GenerationRecord;
  index: number;
  onDelete: (id: number) => void;
}) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  return (
    <div
      className="card-hover"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: 16,
        transition: "all 0.2s",
        animation: `fade-in-up 0.4s ease-out ${index * 0.03}s forwards`,
        opacity: 0,
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ProviderBadge provider={record.provider} size="small" />
          <StatusBadge status={record.status as RecordStatus} />
        </div>
        {record.duration_ms && (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDuration(record.duration_ms)}</span>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <Typography.Text
          ellipsis={!showFullPrompt}
          style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, display: "block" }}
          title={record.prompt || undefined}
        >
          {record.prompt || "无提示词"}
        </Typography.Text>
        {record.prompt && record.prompt.length > 100 && (
          <Button
            type="link"
            size="small"
            onClick={() => setShowFullPrompt(!showFullPrompt)}
            style={{ padding: 0, height: "auto", fontSize: 11, color: "var(--accent-primary)" }}
          >
            {showFullPrompt ? "收起" : "展开"}
          </Button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: "var(--text-muted)" }}>
        {record.model && (
          <Tag style={{ margin: 0, fontSize: 10, background: "var(--bg-elevated)", borderColor: "var(--border-subtle)" }}>
            {record.model}
          </Tag>
        )}
        <span>{new Date(record.created_at).toLocaleString("zh-CN")}</span>
        <span style={{ marginLeft: "auto" }}>#{record.id}</span>
      </div>

      {record.error_message && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "color-mix(in srgb, var(--color-error) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-error) 20%, transparent)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--color-error)",
          }}
        >
          {record.error_message}
        </div>
      )}
    </div>
  );
});
