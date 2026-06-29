"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pagination, Popconfirm } from "antd";
import { LeftOutlined, RightOutlined, DeleteOutlined } from "@ant-design/icons";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { EmptyState, EmptyStates } from "@/components/ui/EmptyState";
import { ProviderBadge, StatusBadge } from "@/components/ui/TagBadge";
import type { RecordItem } from "./hooks/useRecords";

interface HistorySidebarProps {
  open: boolean;
  onToggle: () => void;
  records: RecordItem[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (p: number) => void;
  onSelectPrompt: (prompt: string) => void;
  onDelete: (id: number) => void;
}

export function HistorySidebar({
  open,
  onToggle,
  records,
  loading,
  page,
  total,
  onPageChange,
  onSelectPrompt,
  onDelete,
}: HistorySidebarProps) {
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="history-sidebar"
          >
            <div className="history-sidebar__header">历史记录</div>
            <div className="history-sidebar__body scrollbar-custom">
              {loading ? (
                <LoadingCard count={5} height={72} />
              ) : records.length === 0 ? (
                <EmptyState
                  {...EmptyStates.noRecords.props}
                  style={{ marginTop: 48 }}
                />
              ) : (
                records.map((item) => (
                  <div
                    key={item.id}
                    className="history-item"
                    onClick={() => onSelectPrompt(item.prompt)}
                  >
                    <div className="history-item__prompt">{item.prompt}</div>
                    <div className="history-item__meta">
                      <ProviderBadge provider={item.provider} size="small" />
                      <StatusBadge
                        status={item.status === "success" ? "success" : "failed"}
                      />
                      <span className="history-item__time">
                        {new Date(item.created_at).toLocaleString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Popconfirm
                        title="确认删除？"
                        onConfirm={() => onDelete(item.id)}
                        okText="删除"
                        cancelText="取消"
                      >
                        <DeleteOutlined
                          className="history-item__delete"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                ))
              )}
            </div>
            {total > 20 && (
              <div className="history-sidebar__footer">
                <Pagination
                  size="small"
                  current={page}
                  total={total}
                  pageSize={20}
                  onChange={onPageChange}
                  showSizeChanger={false}
                />
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <button className="sidebar-toggle" onClick={onToggle} style={{ left: open ? 280 : 0 }}>
        {open ? <LeftOutlined style={{ fontSize: 9 }} /> : <RightOutlined style={{ fontSize: 9 }} />}
      </button>

      <style jsx>{`
        .history-sidebar {
          border-right: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
        }
        .history-sidebar__header {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-subtle);
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary);
        }
        .history-sidebar__body {
          flex: 1;
          overflow: auto;
          padding: 6px 8px;
        }
        .history-sidebar__footer {
          padding: 6px 10px;
          border-top: 1px solid var(--border-subtle);
        }

        .history-item {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          margin-bottom: 4px;
          cursor: pointer;
          transition: all 0.12s;
          background: var(--bg-elevated);
        }
        .history-item:hover {
          border-color: var(--border-accent);
          background: var(--bg-surface);
        }
        .history-item__prompt {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 4px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .history-item__meta {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .history-item__time {
          font-size: 10px;
          color: var(--text-muted);
          margin-left: auto;
        }
        .history-item__delete {
          font-size: 10px;
          color: var(--text-muted);
          cursor: pointer;
        }
        .history-item__delete:hover {
          color: var(--color-error);
        }

        .sidebar-toggle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          width: 18px;
          height: 44px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 0 6px 6px 0;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: left 0.2s ease;
          border-left: none;
        }
      `}</style>
    </>
  );
}
