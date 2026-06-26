import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Get current user session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { path: pathParts } = await params;

  // Validate path structure: [userId, year, month, day, filename]
  if (!pathParts || pathParts.length < 5) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const [pathUserId, year, month, day, filename] = pathParts;

  // Ensure user can only access their own images
  if (parseInt(pathUserId) !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate filename to prevent path traversal
  if (!filename || filename.includes("..") || !filename.endsWith(".png")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // Build file path
  const relativePath = path.join("images", pathUserId, year, month, day, filename);
  const fullPath = path.join(process.cwd(), "data", relativePath);

  try {
    // Read and return the image
    const imageBuffer = await readFile(fullPath);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to read image:", error);
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
