import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listFavorites,
  listFavoriteCollections,
  createCollection,
  renameCollection,
  deleteCollection,
} from "@/lib/db";

/**
 * GET /api/favorites?collection=…
 * Returns the authenticated user's favorite collections and (optionally)
 * the record ids within one collection.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const collection = searchParams.get("collection") || undefined;

  const [favorites, collections] = await Promise.all([
    listFavorites(userId, collection),
    listFavoriteCollections(userId),
  ]);

  return NextResponse.json({
    favorites,
    collections,
  });
}

/**
 * POST /api/favorites
 * Body: { name: string }  → create a new collection
 * Body: { action: "rename"; oldName: string; newName: string }
 * Body: { action: "delete"; name: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await request.json();

  if (typeof body?.name === "string") {
    await createCollection(userId, body.name);
    return NextResponse.json({ success: true });
  }

  if (body?.action === "rename") {
    await renameCollection(userId, body.oldName, body.newName);
    return NextResponse.json({ success: true });
  }

  if (body?.action === "delete") {
    await deleteCollection(userId, body.name);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
