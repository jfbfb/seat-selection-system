import { NextResponse } from "next/server";
import { selectSeat, SeatSelectionError } from "@/lib/seat-lock";
import { getViewUrl } from "@/lib/codes";
import { Gender } from "@prisma/client";
import { z } from "zod";

const selectSchema = z.object({
  seatId: z.string().uuid(),
  studentName: z.string().min(1).max(50),
  gender: z.enum(["male", "female", "other"]),
  allowDuplicateName: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const body = selectSchema.parse(await request.json());
    const result = await selectSeat({
      inviteCode: code,
      seatId: body.seatId,
      studentName: body.studentName,
      gender: body.gender as Gender,
      allowDuplicateName: body.allowDuplicateName,
    });

    return NextResponse.json({
      ok: true,
      viewToken: result.viewToken,
      viewUrl: getViewUrl(result.viewToken),
      duplicateWarning: result.duplicateWarning,
    });
  } catch (e) {
    if (e instanceof SeatSelectionError) {
      const status =
        e.code === "DUPLICATE_NAME"
          ? 409
          : e.code === "SEAT_TAKEN"
            ? 409
            : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
