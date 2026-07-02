"use client";

import React, { useRef } from "react";
import { Button, App } from "antd";
import { PlusOutlined, UploadOutlined, CopyOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useGenerateStore } from "@/stores/generate-store";
import styles from "./ReferenceStrip.module.css";

export function ReferenceStrip() {
  const { message } = App.useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const references = useGenerateStore((s) => s.references);
  const addReferences = useGenerateStore((s) => s.addReferences);
  const removeReference = useGenerateStore((s) => s.removeReference);
  const moveReference = useGenerateStore((s) => s.moveReference);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      next.push({ id: `ref-${Date.now()}-${next.length}`, name: file.name, dataUrl });
    }
    if (next.length) addReferences(next);
  };

  const addFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      const blobs: Blob[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) blobs.push(await item.getType(type));
        }
      }
      if (!blobs.length) {
        message.error("剪切板里没有可读取的图片");
        return;
      }
      const next = await Promise.all(
        blobs.map(async (blob, i) => {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return { id: `clip-${Date.now()}-${i}`, name: `clipboard-${i + 1}.png`, dataUrl };
        }),
      );
      addReferences(next);
      message.success(`已读取 ${next.length} 张参考图`);
    } catch {
      message.error("剪切板里没有可读取的图片");
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>参考图</span>
        <div className={styles.sectionActions}>
          <Button size="small" icon={<CopyOutlined />} onClick={() => void addFromClipboard()}>
            剪切板
          </Button>
          <Button size="small" icon={<UploadOutlined />} onClick={() => fileRef.current?.click()}>
            上传
          </Button>
        </div>
      </div>
      <div
        className={styles.scroller}
        onWheel={(e) => {
          const el = e.currentTarget;
          if (el.scrollWidth <= el.clientWidth) return;
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }}
      >
        {references.map((ref, idx) => (
          <div key={ref.id} className={styles.thumb}>
            <img src={ref.dataUrl} alt={ref.name} />
            <span className={styles.thumbLabel}>{idx + 1}</span>
            <div className={styles.orderBtns}>
              <button
                className={styles.orderBtn}
                disabled={idx === 0}
                onClick={() => moveReference(idx, -1)}
                aria-label="左移"
              >
                <LeftOutlined style={{ fontSize: 10 }} />
              </button>
              <button
                className={styles.orderBtn}
                disabled={idx === references.length - 1}
                onClick={() => moveReference(idx, 1)}
                aria-label="右移"
              >
                <RightOutlined style={{ fontSize: 10 }} />
              </button>
            </div>
            <button
              className={styles.thumbRemove}
              onClick={() => removeReference(ref.id)}
              aria-label="移除参考图"
            >
              ×
            </button>
          </div>
        ))}
        {!references.length && <div className={styles.empty}>暂无参考图</div>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.hidden}
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
