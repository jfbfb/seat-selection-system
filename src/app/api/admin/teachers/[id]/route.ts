import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/session";
import { z } from "zod";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

const patchSchema = z.object({
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());
    const data: { active?: boolean; passwordHash?: string } = {};
    if (body.active !== undefined) data.active = body.active;
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const teacher = await prisma.teacher.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, active: true },
    });

    return NextResponse.json({ teacher });
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
