import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getClassSeatState } from "@/lib/class-service";
import { buildClassExcel, genderLabel } from "@/lib/export";
import { SEAT_TYPE_LABELS } from "@/lib/types";

async function requireTeacherClass(classId: string) {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: session.id },
  });
  return cls;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cls = await requireTeacherClass(id);
  if (!cls) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const state = await getClassSeatState(id);
  if (!state) {
    return NextResponse.json({ error: "班级不存在" }, { status: 404 });
  }

  const rows = state.seats.map((s) => ({
    row: s.row,
    col: s.col,
    type: SEAT_TYPE_LABELS[s.type],
    studentName: s.selection?.studentName ?? "",
    gender: s.selection ? genderLabel(s.selection.gender) : "",
  }));

  const buffer = await buildClassExcel(cls.name, rows);
  const filename = encodeURIComponent(`${cls.name}-座位表.xlsx`);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
