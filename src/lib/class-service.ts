import { SeatType } from "@prisma/client";
import { prisma } from "./prisma";
import { emitClassEvent } from "./events";
import { clampPodium, defaultPodiumCol, DEFAULT_PODIUM_SPAN } from "./types";

export async function createClassWithSeats(params: {
  teacherId: string;
  name: string;
  description?: string;
  rows: number;
  cols: number;
  podiumCol?: number;
  podiumSpan?: number;
}) {
  const { rows, cols } = params;
  if (rows < 1 || rows > 30 || cols < 1 || cols > 30) {
    throw new Error("行列数须在 1-30 之间");
  }

  const { podiumCol, podiumSpan } = clampPodium(
    params.podiumCol ?? defaultPodiumCol(cols, params.podiumSpan),
    params.podiumSpan ?? DEFAULT_PODIUM_SPAN,
    cols
  );

  return prisma.$transaction(async (tx) => {
    const cls = await tx.class.create({
      data: {
        teacherId: params.teacherId,
        name: params.name,
        description: params.description,
        rows,
        cols,
        podiumCol,
        podiumSpan,
      },
    });

    const seats = [];
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= cols; col++) {
        seats.push({
          classId: cls.id,
          row,
          col,
          type: "normal" as SeatType,
        });
      }
    }

    await tx.seat.createMany({ data: seats });

    return cls;
  });
}

export async function resizeClassGrid(
  classId: string,
  newRows: number,
  newCols: number
) {
  if (newRows < 1 || newRows > 30 || newCols < 1 || newCols > 30) {
    throw new Error("行列数须在 1-30 之间");
  }

  await prisma.$transaction(async (tx) => {
    const cls = await tx.class.findUnique({
      where: { id: classId },
      include: { seats: { include: { selection: true } } },
    });
    if (!cls) throw new Error("班级不存在");

    const existing = new Map(
      cls.seats.map((s) => [`${s.row}-${s.col}`, s])
    );

    for (let row = 1; row <= newRows; row++) {
      for (let col = 1; col <= newCols; col++) {
        const key = `${row}-${col}`;
        if (!existing.has(key)) {
          await tx.seat.create({
            data: { classId, row, col, type: "normal" },
          });
        }
      }
    }

    for (const seat of cls.seats) {
      if (seat.row > newRows || seat.col > newCols) {
        if (seat.selection) {
          throw new Error(
            `座位 ${seat.row}排${seat.col}列 有人，无法缩小网格`
          );
        }
        await tx.seat.delete({ where: { id: seat.id } });
      }
    }

    const { podiumCol, podiumSpan } = clampPodium(
      cls.podiumCol,
      cls.podiumSpan,
      newCols
    );

    await tx.class.update({
      where: { id: classId },
      data: {
        rows: newRows,
        cols: newCols,
        podiumCol,
        podiumSpan,
      },
    });
  });

  emitClassEvent(classId, "layout_updated");
}

export async function updateSeatType(
  classId: string,
  seatId: string,
  type: SeatType
) {
  const seat = await prisma.seat.findFirst({
    where: { id: seatId, classId },
    include: { selection: true },
  });
  if (!seat) throw new Error("座位不存在");

  if (type !== "normal" && seat.selection) {
    throw new Error("该座位有人，请先移走学生");
  }

  await prisma.seat.update({
    where: { id: seatId },
    data: { type },
  });

  emitClassEvent(classId, "layout_updated");
}

export async function getClassSeatState(classId: string) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      seats: {
        orderBy: [{ row: "asc" }, { col: "asc" }],
        include: {
          selection: {
            select: {
              id: true,
              studentName: true,
              gender: true,
            },
          },
        },
      },
    },
  });

  if (!cls) return null;

  const { podiumCol, podiumSpan } = clampPodium(
    cls.podiumCol ?? defaultPodiumCol(cls.cols),
    cls.podiumSpan ?? DEFAULT_PODIUM_SPAN,
    cls.cols
  );

  return {
    classId: cls.id,
    name: cls.name,
    rows: cls.rows,
    cols: cls.cols,
    podiumCol,
    podiumSpan,
    selectionOpen: cls.selectionOpen,
    seats: cls.seats.map((s) => ({
      id: s.id,
      row: s.row,
      col: s.col,
      type: s.type,
      selection: s.selection,
    })),
  };
}
