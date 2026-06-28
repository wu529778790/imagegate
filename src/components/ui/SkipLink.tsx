/**
 * SkipLink - Accessibility skip link for keyboard navigation
 * Allows keyboard users to skip navigation and jump to main content
 */

import React from 'react';

export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string;
  /** Link text */
  text?: string;
  /** Additional className */
  className?: string;
}

export function SkipLink({ targetId, text = '跳到主要内容', className }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      style={{
        position: 'absolute',
        top: '-100%',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: 'var(--accent-primary, #6366f1)',
        color: '#fff',
        borderRadius: 8,
        zIndex: 9999,
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
        transition: 'top 0.2s',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '16px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-100%';
      }}
    >
      {text}
    </a>
  );
}

/**
 * MainContent - Wrapper with skip link support
 */
export function MainContent({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <div id={id} className={className} tabIndex={-1}>
      {children}
    </div>
  );
}
