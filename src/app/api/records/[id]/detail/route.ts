import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/records/[id]/detail
 * Returns the generation record plus a resolvable image URL so the favorites
 * page can render thumbnails.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getDb();

  const record = db
    .prepare(
      `SELECT
         gr.id, gr.prompt, gr.provider, gr.model, gr.ar, gr.quality,
         gr.status, gr.error_message, gr.duration_ms, gr.image_url, gr.created_at,
         i.id as image_id, i.local_path, i.github_path
       FROM generation_records gr
       LEFT JOIN images i ON i.generation_id = gr.id
       WHERE gr.id = ?
       LIMIT 1`,
    )
    .get(id) as
    | {
        id: number;
        prompt: string | null;
        provider: string;
        model: string | null;
        ar: string | null;
        quality: string | null;
        status: string;
        error_message: string | null;
        duration_ms: number | null;
        image_url: string | null;
        created_at: string;
        image_id: number | null;
        local_path: string | null;
        github_path: string | null;
      }
    | undefined;

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const imageUrl =
    record.image_id != null && record.local_path
      ? `/api/images/${record.local_path.replace(/^.*?\//, "")}`
      : record.image_url;

  return NextResponse.json({
    id: record.id,
    prompt: record.prompt,
    provider: record.provider,
    model: record.model,
    ar: (record.ar as string) || "1:1",
    quality: (record.quality as string) || "2k",
    status: record.status,
    error_message: record.error_message,
    duration_ms: record.duration_ms,
    created_at: record.created_at,
    imageUrl,
    synced: !!record.github_path,
  });
}
