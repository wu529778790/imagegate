"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import AuthModal from "@/components/AuthModal";

interface AuthContextType {
  requireAuth: (options?: { action?: string; onSuccess?: () => void }) => Promise<boolean>;
  openAuthModal: (options?: { action?: string; onSuccess?: () => void }) => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authOptions, setAuthOptions] = useState<{ action?: string; onSuccess?: () => void }>({});
  const promiseRef = useRef<((value: boolean) => void) | null>(null);

  const openAuthModal = useCallback((options?: { action?: string; onSuccess?: () => void }) => {
    setAuthOptions(options || {});
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    // Resolve the pending promise as false if user closed
    if (promiseRef.current) {
      promiseRef.current(false);
      promiseRef.current = null;
    }
  }, []);

  const requireAuth = useCallback(
    (options?: { action?: string; onSuccess?: () => void }): Promise<boolean> => {
      return new Promise((resolve) => {
        promiseRef.current = resolve;
        setAuthOptions({
          ...options,
          onSuccess: () => {
            // Clear promiseRef BEFORE calling closeAuthModal to prevent it from resolving false
            promiseRef.current = null;
            closeAuthModal();
            options?.onSuccess?.();
            resolve(true);
          },
        });
        setAuthModalOpen(true);
      });
    },
    [closeAuthModal],
  );

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

export function useAuthModal() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthModal must be used within an AuthProvider");
  }
  return context;
}
