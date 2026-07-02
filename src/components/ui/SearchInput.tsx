"use client";

import React, { forwardRef } from "react";
import { SearchOutlined, CloseCircleFilled } from "@ant-design/icons";
import styles from "./SearchInput.module.css";

export interface SearchInputProps {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

/**
 * Compact search input with clear button. Controlled — parent owns value.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    { value = "", onChange, placeholder = "搜索…", className, debounceMs = 0 },
    externalRef,
  ) {
    // If a debounce is requested, the parent should wire `useDeferredValue`
    // or similar; this component just renders a plain controlled input.
    void debounceMs;

    return (
      <div className={`${styles.wrap} ${className || ""}`}>
        <SearchOutlined className={styles.icon} />
        <input
          ref={externalRef}
          type="search"
          className={styles.input}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
        />
        {value && (
          <CloseCircleFilled
            className={styles.clear}
            onClick={() => onChange("")}
            role="button"
            aria-label="清除搜索"
          />
        )}
      </div>
    );
  },
);
