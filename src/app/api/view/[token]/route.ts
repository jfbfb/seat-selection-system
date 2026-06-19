import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClassSeatState } from "@/lib/class-service";
import { formatSeatLabel, GENDER_LABELS } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const selection = await prisma.selection.findUnique({
    where: { viewToken: token },
    include: {
      class: { select: { name: true } },
      seat: { select: { id: true, row: true, col: true } },
    },
  });

  if (!selection) {
    return NextResponse.json({ error: "链接无效" }, { status: 404 });
  }

  const seatState = await getClassSeatState(selection.classId);
  if (!seatState) {
    return NextResponse.json({ error: "班级不存在" }, { status: 404 });
  }

  return NextResponse.json({
    classId: selection.classId,
    className: selection.class.name,
    mySeatId: selection.seat.id,
    studentName: selection.studentName,
    gender: selection.gender,
    genderLabel: GENDER_LABELS[selection.gender],
    seatLabel: formatSeatLabel(selection.seat.row, selection.seat.col),
    row: selection.seat.row,
    col: selection.seat.col,
    createdAt: selection.createdAt,
    seatState,
  });
}
