"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { PROMPT_TEMPLATES, TEMPLATE_CATEGORIES, type PromptTemplate } from "@/lib/prompts";
import styles from "./TemplateSelector.module.css";

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
    <div className={styles.templateSelector}>
      <div className={styles.tabs}>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setTemplateCategory(cat.id);
              setShowTemplates(true);
            }}
            className={`${styles.templateTab} ${
              templateCategory === cat.id && showTemplates ? styles.templateTabActive : ""
            }`}
          >
            {cat.label}
          </button>
        ))}
        <div className={styles.actions}>
          <button
            onClick={() => {
              onToggleBatch();
            }}
            className={`${styles.batchToggle} ${batchMode ? styles.batchToggleActive : ""}`}
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
            className={styles.listWrapper}
          >
            <div className={styles.list}>
              {filteredTemplates.map((t) => (
                <Tooltip key={t.id} title="点击应用" placement="top">
                  <button onClick={() => applyTemplate(t)} className={styles.chip}>
                    {t.icon} {t.label}
                  </button>
                </Tooltip>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
