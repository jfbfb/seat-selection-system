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

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getSelectUrl(code: string): string {
  return `${getAppUrl()}/select/${code}`;
}

export function getViewUrl(token: string): string {
  return `${getAppUrl()}/view/${token}`;
}
