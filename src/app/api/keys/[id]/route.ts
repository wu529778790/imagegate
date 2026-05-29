import { NextRequest, NextResponse } from "next/server";
import { deleteKey, toggleKey } from "@/lib/db";

function parseId(idStr: string): number | null {
  const id = Number(idStr);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  deleteKey(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseId(idStr);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const { is_active } = await request.json();
  if (typeof is_active !== "boolean") {
    return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
  }
  toggleKey(id, is_active);
  return NextResponse.json({ success: true });
}
