import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addFavorite, removeFavorite } from "@/lib/db";

/**
 * POST /api/records/[id]/favorite
 * Body: { collection: string, action: "add" | "remove" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { id } = await params;
  const recordId = parseInt(id);
  if (!recordId) {
    return NextResponse.json({ error: "Missing record id" }, { status: 400 });
  }

  const { collection, action } = (await request.json()) as {
    collection: string;
    action: "add" | "remove";
  };

  if (!collection || !action) {
    return NextResponse.json({ error: "Missing collection or action" }, { status: 400 });
  }

  if (action === "add") {
    await addFavorite(userId, recordId, collection);
  } else if (action === "remove") {
    await removeFavorite(userId, recordId, collection);
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
