import { Gender } from "@prisma/client";
import { prisma } from "./prisma";
import { generateViewToken } from "./codes";
import { emitClassEvent } from "./events";

export class SeatSelectionError extends Error {
  constructor(
    message: string,
    public code:
      | "SEAT_TAKEN"
      | "SEAT_INVALID"
      | "CLASS_CLOSED"
      | "CODE_USED"
      | "CODE_INVALID"
      | "DUPLICATE_NAME"
  ) {
    super(message);
    this.name = "SeatSelectionError";
  }
}

export async function checkDuplicateName(
  classId: string,
  studentName: string,
  excludeSelectionId?: string
): Promise<boolean> {
  const existing = await prisma.selection.findFirst({
    where: {
      classId,
      studentName: studentName.trim(),
      ...(excludeSelectionId ? { id: { not: excludeSelectionId } } : {}),
    },
  });
  return !!existing;
}

export async function selectSeat(params: {
  inviteCode: string;
  seatId: string;
  studentName: string;
  gender: Gender;
  allowDuplicateName?: boolean;
}): Promise<{
  selectionId: string;
  viewToken: string;
  duplicateWarning: boolean;
}> {
  const invite = await prisma.inviteCode.findUnique({
    where: { code: params.inviteCode },
    include: { class: true },
  });

  if (!invite) {
    throw new SeatSelectionError("邀请码无效", "CODE_INVALID");
  }
  if (invite.status === "used") {
    throw new SeatSelectionError("邀请码已使用", "CODE_USED");
  }
  if (!invite.class.selectionOpen) {
    throw new SeatSelectionError("选座已关闭", "CLASS_CLOSED");
  }

  const duplicate = await checkDuplicateName(
    invite.classId,
    params.studentName
  );
  if (duplicate && !params.allowDuplicateName) {
    throw new SeatSelectionError("同班已有相同姓名", "DUPLICATE_NAME");
  }

  const viewToken = generateViewToken();

  const result = await prisma.$transaction(async (tx) => {
    const seat = await tx.seat.findFirst({
      where: {
        id: params.seatId,
        classId: invite.classId,
        type: "normal",
        selection: null,
      },
      include: {
        class: true,
      },
    });

    if (!seat) {
      throw new SeatSelectionError("座位已被选或不可选", "SEAT_TAKEN");
    }
    if (!seat.class.selectionOpen) {
      throw new SeatSelectionError("选座已关闭", "CLASS_CLOSED");
    }

    const selection = await tx.selection.create({
      data: {
        classId: invite.classId,
        seatId: seat.id,
        inviteCodeId: invite.id,
        studentName: params.studentName.trim(),
        gender: params.gender,
        viewToken,
      },
    });

    await tx.inviteCode.update({
      where: { id: invite.id },
      data: { status: "used", usedAt: new Date() },
    });

    return selection;
  });

  await checkAndAutoCloseClass(invite.classId);
  emitClassEvent(invite.classId, "seat_selected");

  return {
    selectionId: result.id,
    viewToken: result.viewToken,
    duplicateWarning: duplicate,
  };
}

export async function checkAndAutoCloseClass(classId: string): Promise<boolean> {
  const availableSeats = await prisma.seat.count({
    where: {
      classId,
      type: "normal",
      selection: null,
    },
  });

  if (availableSeats === 0) {
    await prisma.class.update({
      where: { id: classId },
      data: { selectionOpen: false },
    });
    emitClassEvent(classId, "selection_closed");
    return true;
  }
  return false;
}

export async function moveSelection(params: {
  selectionId: string;
  newSeatId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const selection = await tx.selection.findUnique({
      where: { id: params.selectionId },
    });
    if (!selection) throw new Error("选座记录不存在");

    const newSeat = await tx.seat.findFirst({
      where: {
        id: params.newSeatId,
        classId: selection.classId,
        type: "normal",
        selection: null,
      },
    });
    if (!newSeat) {
      throw new SeatSelectionError("目标座位不可用", "SEAT_TAKEN");
    }

    await tx.selection.update({
      where: { id: selection.id },
      data: { seatId: newSeat.id },
    });
  });

  const selection = await prisma.selection.findUnique({
    where: { id: params.selectionId },
  });
  if (selection) {
    emitClassEvent(selection.classId, "seat_moved");
  }
}
