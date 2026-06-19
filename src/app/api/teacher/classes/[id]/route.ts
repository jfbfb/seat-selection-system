import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getClassSeatState } from "@/lib/class-service";
import { emitClassEvent } from "@/lib/events";
import { clampPodium } from "@/lib/types";
import { z } from "zod";

async function requireTeacherClass(classId: string) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;

  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: session.id },
  });
  if (!cls) return null;

  return { session, cls };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireTeacherClass(id);
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const state = await getClassSeatState(id);
  const selections = await prisma.selection.findMany({
    where: { classId: id },
    include: { seat: true, inviteCode: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    class: auth.cls,
    seatState: state,
    selections,
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  selectionOpen: z.boolean().optional(),
  podiumCol: z.number().int().min(1).max(30).optional(),
  podiumSpan: z.number().int().min(1).max(30).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireTeacherClass(id);
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    const data: {
      name?: string;
      description?: string;
      selectionOpen?: boolean;
      podiumCol?: number;
      podiumSpan?: number;
    } = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.selectionOpen !== undefined) data.selectionOpen = body.selectionOpen;

    if (body.podiumCol !== undefined || body.podiumSpan !== undefined) {
      const clamped = clampPodium(
        body.podiumCol ?? auth.cls.podiumCol,
        body.podiumSpan ?? auth.cls.podiumSpan,
        auth.cls.cols
      );
      data.podiumCol = clamped.podiumCol;
      data.podiumSpan = clamped.podiumSpan;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "无有效更新" }, { status: 400 });
    }

    const cls = await prisma.class.update({
      where: { id },
      data,
    });

    if (body.selectionOpen === false) {
      emitClassEvent(id, "selection_closed");
    } else if (body.selectionOpen === true) {
      emitClassEvent(id, "selection_opened");
    } else if (
      body.podiumCol !== undefined ||
      body.podiumSpan !== undefined
    ) {
      emitClassEvent(id, "layout_updated");
    }

    return NextResponse.json({ class: cls });
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireTeacherClass(id);
  if (!auth) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  await prisma.class.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
