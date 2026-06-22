/** POST /api/auth/login — 管理员与老师统一登录入口，成功后写 Session Cookie */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["admin", "teacher"]),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const { username, password, role } = body;

    if (role === "admin") {
      const admin = await prisma.admin.findUnique({ where: { username } });
      if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
        return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
      }
      await setSessionCookie({
        role: "admin",
        id: admin.id,
        username: admin.username,
      });
      return NextResponse.json({ ok: true, role: "admin" });
    }

    const teacher = await prisma.teacher.findUnique({ where: { username } });
    if (!teacher || !teacher.active) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }
    if (!(await verifyPassword(password, teacher.passwordHash))) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }
    await setSessionCookie({
      role: "teacher",
      id: teacher.id,
      username: teacher.username,
      name: teacher.name,
    });
    return NextResponse.json({ ok: true, role: "teacher" });
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
