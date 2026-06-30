"use client";

import { ConfigProvider } from "antd";
import { theme as antTheme } from "antd";
import { AuthProvider } from "@/components/AuthContext";
import { SkipLink } from "@/components/ui/SkipLink";
import { useTheme } from "@/components/ThemeContext";

const DARK_TOKENS = {
  colorPrimary: "#8b5cf6",
  borderRadius: 10,
  colorBgContainer: "#13131f",
  colorBgElevated: "#1a1a2e",
  colorBgLayout: "#0c0c14",
  colorBorder: "rgba(255, 255, 255, 0.06)",
  colorText: "#eaeaef",
  colorTextSecondary: "#9898a8",
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const LIGHT_TOKENS = {
  colorPrimary: "#8b5cf6",
  borderRadius: 10,
  colorBgContainer: "#ffffff",
  colorBgElevated: "#f3f4f6",
  colorBgLayout: "#f9fafb",
  colorBorder: "rgba(0, 0, 0, 0.06)",
  colorText: "#111827",
  colorTextSecondary: "#6b7280",
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export function ThemeAwareProviders({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: isDark ? DARK_TOKENS : LIGHT_TOKENS,
      }}
    >
      <AuthProvider>
        <SkipLink targetId="main-content" />
        <main
          id="main-content"
          style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            position: "relative",
            zIndex: 1,
            padding: 0,
          }}
          tabIndex={-1}
        >
          {children}
        </main>
      </AuthProvider>
    </ConfigProvider>
  );
}

export const ANTI_FOUC_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light') document.documentElement.classList.add('light');
    else if (t === 'dark') document.documentElement.classList.add('dark');
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.classList.add('light');
    else document.documentElement.classList.add('dark');
  } catch(e) { document.documentElement.classList.add('dark'); }
})();
`;
