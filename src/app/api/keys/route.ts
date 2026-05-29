import { NextRequest, NextResponse } from "next/server";
import { getAllKeys, addKey } from "@/lib/db";

function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "****";
  return apiKey.slice(0, 8) + "****" + apiKey.slice(-4);
}

export async function GET() {
  const keys = getAllKeys().map(({ api_key, ...rest }) => ({
    ...rest,
    api_key: maskApiKey(api_key),
  }));
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const { name, provider, api_key } = await request.json();

  if (!name || !provider || !api_key) {
    return NextResponse.json({ error: "name, provider, and api_key are required" }, { status: 400 });
  }

  const key = addKey(name, provider, api_key);
  return NextResponse.json({ ...key, api_key: maskApiKey(key.api_key) }, { status: 201 });
}
