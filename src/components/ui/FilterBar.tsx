"use client";

import React from "react";
import styles from "./FilterBar.module.css";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterBarProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** Accessible label for the group */
  ariaLabel?: string;
  className?: string;
}

/**
 * Generic segmented filter — status tabs, provider toggle, etc.
 * Renders a `role="radiogroup"` of pill buttons.
 */
export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: FilterBarProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`${styles.bar} ${className || ""}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`${styles.btn} ${active ? styles.btnActive : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
