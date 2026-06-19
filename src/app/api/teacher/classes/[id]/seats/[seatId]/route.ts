import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { updateSeatType } from "@/lib/class-service";
import { SeatType } from "@prisma/client";
import { z } from "zod";

async function requireTeacherClass(classId: string) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: session.id },
  });
  return cls ? session : null;
}

const patchSchema = z.object({
  type: z.enum(["normal", "aisle", "empty"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; seatId: string }> }
) {
  const { id, seatId } = await params;
  const session = await requireTeacherClass(id);
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    await updateSeatType(id, seatId, body.type as SeatType);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "请求无效";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
