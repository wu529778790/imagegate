/**
 * Duration formatting — consistent across gallery & home.
 */

export function formatMs(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1_000) return `${ms}ms`;
  const sec = ms / 1_000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const remSec = Math.round(sec % 60);
  return remSec === 0 ? `${min}m` : `${min}m ${remSec}s`;
}
