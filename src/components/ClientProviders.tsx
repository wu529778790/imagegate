/**
 * ClientProviders — Client Boundary wrapping all client-side providers.
 *
 * This is the single "use client" boundary at the layout level.
 * The root layout itself is a Server Component — it only renders
 * this wrapper and the HTML shell.
 *
 * Contains:
 * - SessionProvider (next-auth)
 * - ThemeProvider (custom)
 * - AntdRegistry (Ant Design SSR)
 * - SWRConfig (global fetch config + error handling)
 * - AppHeader
 * - ThemeAwareProviders (Ant Design ConfigProvider + AuthProvider)
 */

'use client';

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SWRConfig } from "swr";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeContext";
import { AppHeader, ThemeAwareProviders } from "@/components/layout";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            shouldRetryOnError: (err) => {
              // Don't retry on 4xx errors
              if (err instanceof Error && "statusCode" in err) {
                const status = Number((err as Record<string, unknown>).statusCode);
                return status >= 500;
              }
              return true;
            },
            onErrorRetry: (err, key, config, revalidate, opts) => {
              // Max 3 retries
              if (opts.retryCount >= 3) return;
              // Retry after 5 seconds
              setTimeout(() => revalidate({ retryCount: opts.retryCount }), 5000);
            },
          }}
        >
          <AntdRegistry>
            <div className="mesh-bg" />
            <AppHeader />
            <ThemeAwareProviders>{children}</ThemeAwareProviders>
          </AntdRegistry>
        </SWRConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}
