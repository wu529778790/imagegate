"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import AuthModal from "@/components/AuthModal";

interface AuthContextType {
  /** 触发登录/配置检查弹窗 */
  requireAuth: (options?: { action?: string; onSuccess?: () => void }) => Promise<boolean>;
  /** 直接打开登录弹窗 */
  openAuthModal: (options?: { action?: string; onSuccess?: () => void }) => void;
  /** 关闭登录弹窗 */
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authOptions, setAuthOptions] = useState<{ action?: string; onSuccess?: () => void }>({});

  const openAuthModal = useCallback((options?: { action?: string; onSuccess?: () => void }) => {
    setAuthOptions(options || {});
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    // 延迟清空 options，等待动画完成
    setTimeout(() => setAuthOptions({}), 300);
  }, []);

  /**
   * 触发认证检查
   * @returns Promise<boolean> - true 表示已登录且已配置，false 表示用户关闭了弹窗或未完成配置
   */
  const requireAuth = useCallback((options?: { action?: string; onSuccess?: () => void }): Promise<boolean> => {
    return new Promise((resolve) => {
      setAuthOptions({
        ...options,
        onSuccess: () => {
          closeAuthModal();
          if (options?.onSuccess) {
            options.onSuccess();
          }
          resolve(true);
        },
      });
      setAuthModalOpen(true);
    });
  }, [closeAuthModal]);

  return (
    <AuthContext.Provider value={{ requireAuth, openAuthModal, closeAuthModal }}>
      {children}
      <AuthModal
        open={authModalOpen}
        onClose={closeAuthModal}
        action={authOptions.action}
        onSuccess={authOptions.onSuccess}
      />
    </AuthContext.Provider>
  );
}

/**
 * Hook to use auth modal
 * @throws Error if used outside AuthProvider
 */
export function useAuthModal() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within an AuthProvider");
  }
  return context;
}
