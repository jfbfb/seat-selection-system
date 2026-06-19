import { randomBytes } from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  const part = () => {
    let result = "";
    const bytes = randomBytes(4);
    for (let i = 0; i < 4; i++) {
      result += CHARSET[bytes[i] % CHARSET.length];
    }
    return result;
  };
  return `${part()}-${part()}`;
}

export function generateViewToken(): string {
  return randomBytes(32).toString("hex");
}

export function getAppUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && configured !== "http://localhost:3000") {
    return configured;
  }

  if (request) {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto") ??
        (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  return configured ?? "http://localhost:3000";
}

export function getSelectUrl(code: string, request?: Request): string {
  return `${getAppUrl(request)}/select/${code}`;
}

export function getViewUrl(token: string, request?: Request): string {
  return `${getAppUrl(request)}/view/${token}`;
}
