import { NextResponse } from "next/server";
import { getClassSeatState } from "@/lib/class-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = await getClassSeatState(id);
  if (!state) {
    return NextResponse.json({ error: "班级不存在" }, { status: 404 });
  }

  return NextResponse.json({ seatState: state });
}
