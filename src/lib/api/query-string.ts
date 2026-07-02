/**
 * Query string helper — strips undefined, null, and empty-string values
 * so that SWR keys stay clean and cache-friendly.
 */

export function toQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qp.set(k, String(v));
  }
  return qp.toString();
}
