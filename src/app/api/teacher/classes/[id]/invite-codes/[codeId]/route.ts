import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireTeacherClass(classId: string) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: session.id },
  });
  return cls ? session : null;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; codeId: string }> }
) {
  const { id, codeId } = await params;
  const session = await requireTeacherClass(id);
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const inviteCode = await prisma.inviteCode.findFirst({
    where: { id: codeId, classId: id },
  });

  if (!inviteCode) {
    return NextResponse.json({ error: "邀请码不存在" }, { status: 404 });
  }

  if (inviteCode.status === "used") {
    return NextResponse.json(
      { error: "已使用的邀请码不能删除" },
      { status: 400 }
    );
  }

  await prisma.inviteCode.delete({ where: { id: codeId } });

  return NextResponse.json({ ok: true });
}
