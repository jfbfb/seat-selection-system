import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createClassWithSeats } from "@/lib/class-service";
import { z } from "zod";

async function requireTeacher() {
  const session = await getSession();
  if (!session || session.role !== "teacher") return null;
  return session;
}

export async function GET() {
  const session = await requireTeacher();
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const classes = await prisma.class.findMany({
    where: { teacherId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          seats: true,
          selections: true,
          inviteCodes: true,
        },
      },
    },
  });

  return NextResponse.json({ classes });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  rows: z.number().int().min(1).max(30),
  cols: z.number().int().min(1).max(30),
  podiumCol: z.number().int().min(1).max(30).optional(),
  podiumSpan: z.number().int().min(1).max(30).optional(),
});

export async function POST(request: Request) {
  const session = await requireTeacher();
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const cls = await createClassWithSeats({
      teacherId: session.id,
      name: body.name,
      description: body.description,
      rows: body.rows,
      cols: body.cols,
      podiumCol: body.podiumCol,
      podiumSpan: body.podiumSpan,
    });
    return NextResponse.json({ class: cls });
  } catch (e) {
    const message = e instanceof Error ? e.message : "请求无效";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
