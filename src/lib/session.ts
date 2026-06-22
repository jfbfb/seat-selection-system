/**
 * 登录 Session 管理
 *
 * 管理员和老师登录后，服务端签发 JWT 写入 Cookie（seat_session）。
 * 后续 API 通过 getSession() 读取 Cookie 判断身份。
 * 学生端不走路径，使用邀请码 + viewToken。
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type SessionRole = "admin" | "teacher";

export interface SessionPayload {
  role: SessionRole;
  id: string;
  username: string;
  name?: string;
}

const COOKIE_NAME = "seat_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.role !== "string" ||
      typeof payload.id !== "string" ||
      typeof payload.username !== "string"
    ) {
      return null;
    }
    return {
      role: payload.role as SessionRole,
      id: payload.id,
      username: payload.username,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
