"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, Select, Space, Typography, message, Pagination, Button, Tag } from "antd";
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { HeaderSection, EmptyState, EmptyStates, LoadingGrid, ProviderBadge, StatusBadge, StatsCard } from "@/components/ui";
import { formatDuration, cn } from "@/lib/ui";

const { Text } = Typography;

interface GenerationRecordItem {
  id: number;
  provider: string;
  model: string | null;
  prompt: string | null;
  status: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export default function RecordsPage() {
  const [records, setRecords] = useState<GenerationRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [providerFilter, setProviderFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    avgDuration: 0,
  });

  // Compute statistics
  useEffect(() => {
    const successCount = records.filter(r => r.status === "success").length;
    const failedCount = records.filter(r => r.status === "failed").length;
    const avgDuration = records.length > 0
      ? records.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / records.length
      : 0;

    setStats({
      total: records.length,
      success: successCount,
      failed: failedCount,
      avgDuration: Math.round(avgDuration / 1000),
    });
  }, [records]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (providerFilter) params.set("provider", providerFilter);
      if (statusFilter) params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/records?${params}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) {
          setRecords(data.records || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) message.error("加载记录失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, providerFilter, statusFilter]);

  const providerOptions = [
    { value: "zai", label: "Z.AI" },
    { value: "openai", label: "OpenAI" },
    { value: "google", label: "Google" },
    { value: "openrouter", label: "OpenRouter" },
    { value: "dashscope", label: "DashScope" },
    { value: "minimax", label: "MiniMax" },
    { value: "replicate", label: "Replicate" },
    { value: "jimeng", label: "即梦" },
    { value: "seedream", label: "豆包" },
    { value: "azure", label: "Azure" },
  ];

  const statusOptions = [
    { value: "success", label: "成功" },
    { value: "failed", label: "失败" },
    { value: "pending", label: "进行中" },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <HeaderSection
        title="生成记录"
        subtitle="查看所有历史生成记录"
        marginBottom={24}
      />

      {/* Stats Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatsCard
          title="总记录"
          value={stats.total}
          icon={<ClockCircleOutlined />}
          color="var(--accent-primary, #6366f1)"
        />
        <StatsCard
          title="成功"
          value={stats.success}
          icon={<CheckCircleOutlined />}
          color="var(--color-success, #22c55e)"
          trend={{ value: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0, isPositive: true }}
        />
        <StatsCard
          title="失败"
          value={stats.failed}
          icon={<CloseCircleOutlined />}
          color="var(--color-error, #ef4444)"
          trend={{ value: stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0, isPositive: false }}
        />
        <StatsCard
          title="平均耗时"
          value={`${stats.avgDuration}s`}
          icon={<ReloadOutlined />}
          color="var(--color-info, #3b82f6)"
        />
      </div>

      {/* Filters */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16, background: "var(--bg-elevated, #141420)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
              onClick={() => {
                setProviderFilter(undefined);
                setStatusFilter(undefined);
              }}
              style={{ color: "var(--text-secondary, #71717a)" }}
            >
              清除筛选
            </Button>
          )}
        </Space>
      </Card>

      {/* Records List */}
      {loading ? (
        <LoadingGrid cols={{ xs: 1, sm: 2, md: 2, lg: 3 }} count={6} />
      ) : records.length === 0 ? (
        <EmptyState {...EmptyStates.noRecords.props} />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: 16,
            }}
          >
            {records.map((record, index) => (
              <RecordCard key={record.id} record={record} index={index} />
            ))}
          </div>

          {total > 20 && (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Pagination
                current={page}
                total={total}
                pageSize={20}
                onChange={setPage}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * RecordCard - Individual record card
 */
function RecordCard({ record, index }: { record: GenerationRecordItem; index: number }) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  const statusConfig = {
    success: { color: "var(--color-success, #22c55e)", label: "成功" },
    failed: { color: "var(--color-error, #ef4444)", label: "失败" },
    pending: { color: "var(--color-warning, #eab308)", label: "进行中" },
  };

  const config = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.pending;

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-elevated, #141420)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    transition: "all 0.2s",
    animation: `fade-in-up 0.4s ease-out ${index * 0.03}s forwards`,
    opacity: 0,
    cursor: "default",
  };

  return (
    <div style={cardStyle} className="card-hover">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ProviderBadge provider={record.provider} size="small" />
          <StatusBadge status={record.status as any} />
        </div>
        {record.duration_ms && (
          <Text style={{ fontSize: 11, color: "var(--text-muted, #52525b)" }}>
            {formatDuration(record.duration_ms)}
          </Text>
        )}
      </div>

      {/* Prompt */}
      <div style={{ marginBottom: 12 }}>
        <Text
          ellipsis={!showFullPrompt}
          style={{
            fontSize: 13,
            color: "var(--text-secondary, #a1a1aa)",
            lineHeight: 1.6,
            display: "block",
          }}
          title={record.prompt || undefined}
        >
          {record.prompt || "无提示词"}
        </Text>
        {record.prompt && record.prompt.length > 100 && (
          <Button
            type="link"
            size="small"
            onClick={() => setShowFullPrompt(!showFullPrompt)}
            style={{ padding: 0, height: "auto", fontSize: 11, color: "var(--accent-primary, #6366f1)" }}
          >
            {showFullPrompt ? "收起" : "展开"}
          </Button>
        )}
      </div>

      {/* Metadata */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 11, color: "var(--text-muted, #52525b)" }}>
        {record.model && (
          <Tag style={{ margin: 0, fontSize: 10, background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}>
            {record.model}
          </Tag>
        )}
        <span>{new Date(record.created_at).toLocaleString("zh-CN")}</span>
        <span style={{ marginLeft: "auto" }}>#{record.id}</span>
      </div>

      {/* Error message */}
      {record.error_message && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--color-error, #ef4444)",
          }}
        >
          {record.error_message}
        </div>
      )}
    </div>
  );
}
