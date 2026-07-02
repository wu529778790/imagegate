import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Get current user session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { searchParams } = new URL(request.url);

  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const offset = (page - 1) * pageSize;

  // Filters
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const db = await getDb();

  const conditions = ["i.user_id = ?"];
  const params: unknown[] = [userId];

  if (status && status !== "all") {
    conditions.push("gr.status = ?");
    params.push(status);
  }
  if (search) {
    conditions.push("i.prompt LIKE ?");
    params.push(`%${search}%`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const total = (db.prepare(
    `SELECT COUNT(*) as count FROM images i LEFT JOIN generation_records gr ON i.generation_id = gr.id ${whereClause}`
  ).get(...params) as { count: number }).count;

  const images = db.prepare(`
    SELECT
      i.id,
      i.local_path,
      i.prompt,
      i.provider,
      i.model,
      i.created_at,
      i.generation_id,
      i.github_path,
      gr.status as generation_status,
      gr.duration_ms as generation_duration
    FROM images i
    LEFT JOIN generation_records gr ON i.generation_id = gr.id
    ${whereClause}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as Array<{
    id: number;
    local_path: string;
    prompt: string;
    provider: string;
    model: string;
    created_at: string;
    generation_id: number;
    github_path: string | null;
    generation_status: string;
    generation_duration: number;
  }>;

  // Transform to API response
  const imageList = images.map((img) => ({
    id: img.id,
    imageUrl: `/api/images/${userId}/${img.local_path.replace("images/", "").replace(/\\/g, "/")}`,
    prompt: img.prompt,
    provider: img.provider,
    model: img.model,
    createdAt: img.created_at,
    generationId: img.generation_id,
    generationStatus: img.generation_status,
    generationDuration: img.generation_duration,
    githubPath: img.github_path,
  }));

  return NextResponse.json({
    images: imageList,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
