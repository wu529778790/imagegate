import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSyncQueueStatus, retryFailedJobs, syncImageNow } from "@/lib/sync";
import { getDb } from "@/lib/db";

// GET /api/sync - Get sync status
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const db = await getDb();

  // Get user's sync statistics
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN github_path IS NOT NULL THEN 1 ELSE 0 END) as synced,
      SUM(CASE WHEN github_path IS NULL THEN 1 ELSE 0 END) as pending
    FROM images
    WHERE user_id = ?
  `).get(userId) as {
    total: number;
    synced: number;
    pending: number;
  };

  // Get queue status
  const queueStatus = getSyncQueueStatus();

  return NextResponse.json({
    user: {
      totalImages: stats.total,
      syncedImages: stats.synced,
      pendingImages: stats.pending,
    },
    queue: {
      pending: queueStatus.pending,
      processing: queueStatus.processing,
    },
  });
}

// POST /api/sync - Trigger sync actions
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await request.json();
  const { action, imageId } = body;

  switch (action) {
    case "retry-all":
      // Retry all failed sync jobs
      await retryFailedJobs();
      return NextResponse.json({ success: true, message: "Retry job queued" });

    case "sync-image":
      // Sync a specific image
      if (!imageId) {
        return NextResponse.json({ error: "imageId required" }, { status: 400 });
      }
      const result = await syncImageNow(userId, imageId);
      return NextResponse.json(result);

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
