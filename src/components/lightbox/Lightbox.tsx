"use client";

import React from "react";
import { Modal, Image, Button } from "antd";
import { LeftOutlined, RightOutlined, DownloadOutlined, CloseOutlined } from "@ant-design/icons";
import { useLightbox } from "@/hooks/use-lightbox";
import { useKeyPress } from "@/lib/react/use-keyboard";
import styles from "./Lightbox.module.css";

export function Lightbox() {
  const { isOpen, images, activeIndex, close, next, prev } = useLightbox();

  useKeyPress("Escape", close, true);
  useKeyPress("ArrowRight", next, true);
  useKeyPress("ArrowLeft", prev, true);

  const src = images[activeIndex];
  if (!src) return null;

  return (
    <Modal
      open={isOpen}
      onCancel={close}
      footer={null}
      width="100vw"
      style={{ maxWidth: "100vw", top: 0, paddingBottom: 0 }}
      closable={false}
      className={styles.modal}
    >
      <div className={styles.body}>
        <div className={styles.main}>
          {images.length > 1 && (
            <button
              className={`${styles.nav} ${styles.navLeft}`}
              onClick={prev}
              disabled={activeIndex === 0}
              aria-label="上一张"
            >
              <LeftOutlined />
            </button>
          )}

          <Image src={src} alt="查看大图" className={styles.img} preview={false} />

          {images.length > 1 && (
            <button
              className={`${styles.nav} ${styles.navRight}`}
              onClick={next}
              disabled={activeIndex === images.length - 1}
              aria-label="下一张"
            >
              <RightOutlined />
            </button>
          )}

          <button className={styles.close} onClick={close} aria-label="关闭">
            <CloseOutlined />
          </button>
        </div>

        {images.length > 1 && (
          <div className={styles.thumbs}>
            {images.map((src, i) => (
              <button
                key={i}
                className={`${styles.thumb} ${i === activeIndex ? styles.thumbActive : ""}`}
                onClick={() => useLightbox.setState({ activeIndex: i })}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
