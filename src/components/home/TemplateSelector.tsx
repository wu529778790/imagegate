"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, Button } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { PROMPT_TEMPLATES, TEMPLATE_CATEGORIES, type PromptTemplate } from "@/lib/prompts";

interface TemplateSelectorProps {
  value: string;
  onChange: (prompt: string) => void;
  batchMode: boolean;
  onToggleBatch: () => void;
}

export function TemplateSelector({ value, onChange, batchMode, onToggleBatch }: TemplateSelectorProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>("product");

  const filteredTemplates = PROMPT_TEMPLATES.filter((t) => t.category === templateCategory);

  const applyTemplate = (t: PromptTemplate) => {
    if (batchMode) {
      onChange(value ? `${value}\n${t.prompt}` : t.prompt);
    } else {
      onChange(t.prompt);
    }
  };

  return (
    <div className="template-selector">
      <div className="template-selector__tabs">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setTemplateCategory(cat.id);
              setShowTemplates(true);
            }}
            className={`template-tab ${
              templateCategory === cat.id && showTemplates ? "template-tab--active" : ""
            }`}
          >
            {cat.label}
          </button>
        ))}
        <div className="template-selector__actions">
          <button
            onClick={() => {
              onToggleBatch();
            }}
            className={`batch-toggle ${batchMode ? "batch-toggle--active" : ""}`}
          >
            <AppstoreOutlined style={{ marginRight: 4 }} />
            {batchMode ? "批量模式" : "单条模式"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="template-list-wrapper"
          >
            <div className="template-list">
              {filteredTemplates.map((t) => (
                <Tooltip key={t.id} title="点击应用" placement="top">
                  <button onClick={() => applyTemplate(t)} className="template-chip">
                    {t.icon} {t.label}
                  </button>
                </Tooltip>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .template-selector {
          margin-bottom: 12px;
        }
        .template-selector__tabs {
          display: flex;
          gap: 6px;
          align-items: center;
          marginBottom: showTemplates ? 8px : 0;
          flex-wrap: wrap;
        }
        .template-tab {
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.12s;
        }
        .template-tab:hover {
          border-color: var(--border-accent);
          color: var(--text-primary);
        }
        .template-tab--active {
          border-color: var(--border-accent);
          background: rgba(139, 92, 246, 0.1);
          color: var(--accent-primary);
        }
        .template-selector__actions {
          margin-left: auto;
          display: flex;
          gap: 4px;
        }
        .batch-toggle {
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.12s;
        }
        .batch-toggle--active {
          border-color: rgba(251, 191, 36, 0.4);
          background: rgba(251, 191, 36, 0.1);
          color: var(--color-warning);
        }
        .template-list-wrapper {
          overflow: hidden;
        }
        .template-list {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          padding-top: 6px;
        }
        .template-chip {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.12s;
        }
        .template-chip:hover {
          border-color: var(--border-accent);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
