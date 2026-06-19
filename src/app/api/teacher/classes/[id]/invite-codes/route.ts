import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateInviteCode, getSelectUrl } from "@/lib/codes";

async function requireTeacherClass(classId: string) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: session.id },
  });
  return cls ? session : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireTeacherClass(id);
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const codes = await prisma.inviteCode.findMany({
    where: { classId: id },
    orderBy: { id: "desc" },
    include: {
      selection: {
        select: { studentName: true, seat: { select: { row: true, col: true } } },
      },
    },
  });

  return NextResponse.json({
    codes: codes.map((c) => ({
      id: c.id,
      code: c.code,
      status: c.status,
      usedAt: c.usedAt,
      url: getSelectUrl(c.code, request),
      selection: c.selection,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireTeacherClass(id);
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  let code = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (!existing) break;
    code = generateInviteCode();
    attempts++;
  }

  const inviteCode = await prisma.inviteCode.create({
    data: { classId: id, code },
  });

  return NextResponse.json({
    code: {
      id: inviteCode.id,
      code: inviteCode.code,
      status: inviteCode.status,
      url: getSelectUrl(inviteCode.code, request),
    },
  });
}
