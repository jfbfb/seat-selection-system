import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/session";
import { z } from "zod";

const createTeacherSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6),
  name: z.string().min(1).max(50),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      name: true,
      active: true,
      createdAt: true,
      _count: { select: { classes: true } },
    },
  });

  return NextResponse.json({ teachers });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = createTeacherSchema.parse(await request.json());
    const existing = await prisma.teacher.findUnique({
      where: { username: body.username },
    });
    if (existing) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const teacher = await prisma.teacher.create({
      data: {
        username: body.username,
        passwordHash: await hashPassword(body.password),
        name: body.name,
      },
      select: { id: true, username: true, name: true, active: true },
    });

    return NextResponse.json({ teacher });
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
