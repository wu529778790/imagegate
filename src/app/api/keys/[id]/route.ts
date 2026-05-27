import { NextRequest, NextResponse } from "next/server";
import { deleteKey, toggleKey } from "@/lib/db";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteKey(Number(id));
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { is_active } = await request.json();
  toggleKey(Number(id), is_active);
  return NextResponse.json({ success: true });
}
