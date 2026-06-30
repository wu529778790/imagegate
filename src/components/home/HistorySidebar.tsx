"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Pagination, Popconfirm } from "antd";
import { LeftOutlined, RightOutlined, DeleteOutlined } from "@ant-design/icons";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { EmptyState, EmptyStates } from "@/components/ui/EmptyState";
import { ProviderBadge, StatusBadge } from "@/components/ui/TagBadge";
import type { RecordItem } from "./hooks/useRecords";
import styles from "./HistorySidebar.module.css";

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
            className={styles.sidebar}
          >
            <div className={styles.header}>历史记录</div>
            <div className={`scrollbar-custom ${styles.body}`}>
              {loading ? (
                <LoadingCard count={5} height={72} />
              ) : records.length === 0 ? (
                <EmptyState
                  {...EmptyStates.noRecords}
                  style={{ marginTop: 48 }}
                />
              ) : (
                records.map((item) => (
                  <div
                    key={item.id}
                    className={styles.item}
                    onClick={() => onSelectPrompt(item.prompt)}
                  >
                    <div className={styles.itemPrompt}>{item.prompt}</div>
                    <div className={styles.itemMeta}>
                      <ProviderBadge provider={item.provider} size="small" />
                      <StatusBadge
                        status={item.status === "success" ? "success" : "failed"}
                      />
                      <span className={styles.itemTime}>
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
                          className={styles.itemDelete}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </div>
                  </div>
                ))
              )}
            </div>
            {total > 20 && (
              <div className={styles.footer}>
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

      <button className={styles.toggle} onClick={onToggle} style={{ left: open ? 280 : 0 }}>
        {open ? <LeftOutlined style={{ fontSize: 9 }} /> : <RightOutlined style={{ fontSize: 9 }} />}
      </button>
    </>
  );
}
