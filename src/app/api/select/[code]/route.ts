/**
 * GET /api/select/[code]
 * 学生打开邀请链接时调用：校验邀请码，返回座位状态或「已使用/已关闭」
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClassSeatState } from "@/lib/class-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const invite = await prisma.inviteCode.findUnique({
    where: { code },
    include: { class: true, selection: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "邀请码无效" }, { status: 404 });
  }

  if (invite.status === "used" && invite.selection) {
    return NextResponse.json({
      status: "used",
      viewToken: invite.selection.viewToken,
      className: invite.class.name,
    });
  }

  if (!invite.class.selectionOpen) {
    return NextResponse.json({ error: "选座已关闭", status: "closed" }, { status: 403 });
  }

  const seatState = await getClassSeatState(invite.classId);

  return NextResponse.json({
    status: "ready",
    classId: invite.classId,
    className: invite.class.name,
    seatState,
  });
}
