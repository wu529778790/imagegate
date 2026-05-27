import { NextRequest, NextResponse } from "next/server";
import { getAllKeys, addKey } from "@/lib/db";

export async function GET() {
  const keys = getAllKeys();
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const { name, provider, api_key } = await request.json();

  if (!name || !provider || !api_key) {
    return NextResponse.json({ error: "name, provider, and api_key are required" }, { status: 400 });
  }

  const key = addKey(name, provider, api_key);
  return NextResponse.json(key, { status: 201 });
}
