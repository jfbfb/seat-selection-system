import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { moveSelection } from "@/lib/seat-lock";
import { checkDuplicateName } from "@/lib/seat-lock";
import { emitClassEvent } from "@/lib/events";
import { Gender } from "@prisma/client";
import { z } from "zod";

async function requireTeacherClass(classId: string) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: session.id },
  });
  return cls ? session : null;
}

const moveSchema = z.object({
  newSeatId: z.string().uuid(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; selectionId: string }> }
) {
  const { id, selectionId } = await params;
  const session = await requireTeacherClass(id);
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = moveSchema.parse(await request.json());
    await moveSelection({ selectionId, newSeatId: body.newSeatId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "请求无效";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const updateSchema = z.object({
  studentName: z.string().min(1).max(50).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  allowDuplicateName: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; selectionId: string }> }
) {
  const { id, selectionId } = await params;
  const session = await requireTeacherClass(id);
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = updateSchema.parse(await request.json());

    if (body.studentName) {
      const duplicate = await checkDuplicateName(
        id,
        body.studentName,
        selectionId
      );
      if (duplicate && !body.allowDuplicateName) {
        return NextResponse.json(
          { error: "同班已有相同姓名", code: "DUPLICATE_NAME" },
          { status: 409 }
        );
      }
    }

    const selection = await prisma.selection.update({
      where: { id: selectionId, classId: id },
      data: {
        ...(body.studentName ? { studentName: body.studentName.trim() } : {}),
        ...(body.gender ? { gender: body.gender as Gender } : {}),
      },
    });

    emitClassEvent(id, "selection_updated");
    return NextResponse.json({ selection });
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
