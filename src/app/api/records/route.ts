import { NextRequest, NextResponse } from "next/server";
import { getRecords } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const result = await getRecords({
    provider: searchParams.get("provider") || undefined,
    status: searchParams.get("status") || undefined,
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("pageSize")) || 20,
  });

  return NextResponse.json(result);
}
