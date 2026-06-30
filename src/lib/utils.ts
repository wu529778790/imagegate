/**
 * Download a base64-encoded image as a file.
 * Replaces all the scattered `document.createElement("a")` patterns.
 */
export function downloadImage(base64: string, name?: string): void {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${base64}`;
  link.download = name || `imagegate-${Date.now()}.png`;
  link.click();
}

/**
 * Copy text to clipboard. Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

/**
 * Format a compact relative time string (e.g. "3m ago", "2h ago", "1d ago").
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}天前`;

  return new Date(dateStr).toLocaleDateString("zh-CN");
}
