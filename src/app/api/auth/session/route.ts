import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ user: null });
  }

  // Access custom properties from session
  const user = session.user as {
    id?: string;
    username?: string;
    avatarUrl?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username || user.name,
      avatarUrl: user.avatarUrl || user.image,
    },
  });
}
