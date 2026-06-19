import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resizeClassGrid } from "@/lib/class-service";
import { z } from "zod";

async function requireTeacherClass(classId: string) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: session.id },
  });
  return cls ? session : null;
}

const resizeSchema = z.object({
  rows: z.number().int().min(1).max(30),
  cols: z.number().int().min(1).max(30),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireTeacherClass(id);
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = resizeSchema.parse(await request.json());
    await resizeClassGrid(id, body.rows, body.cols);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "请求无效";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
