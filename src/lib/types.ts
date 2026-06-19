import { Gender, SeatType } from "@prisma/client";

export const GENDER_LABELS: Record<Gender, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

export const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  normal: "座位",
  aisle: "过道",
  empty: "空位",
};

export function formatSeatLabel(row: number, col: number): string {
  return `${row}排${col}列`;
}

export type GridDensity = "large" | "medium" | "compact";

export const DEFAULT_PODIUM_SPAN = 2;

export function getGridDensity(
  rows: number,
  cols: number,
  isMobile = false
): GridDensity {
  if (isMobile && cols >= 4) return "compact";
  const total = rows * cols;
  if (total <= 48) return "large";
  if (total <= 96) return "medium";
  return "compact";
}

export function truncateName(name: string, maxLen: number): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen)}…`;
}

export function clampPodiumSpan(podiumSpan: number, cols: number): number {
  const safeCols = Math.max(1, cols);
  const base = Number.isFinite(podiumSpan) ? podiumSpan : DEFAULT_PODIUM_SPAN;
  return Math.min(Math.max(1, base), safeCols);
}

export function defaultPodiumCol(
  cols: number,
  span: number = DEFAULT_PODIUM_SPAN
): number {
  const safeCols = Math.max(1, cols);
  const safeSpan = clampPodiumSpan(span, safeCols);
  if (safeCols <= 1) return 1;
  return Math.round((safeCols - safeSpan + 1) / 2);
}

export function maxPodiumCol(cols: number, span: number): number {
  const safeCols = Math.max(1, cols);
  const safeSpan = clampPodiumSpan(span, safeCols);
  return Math.max(1, safeCols - safeSpan + 1);
}

export function clampPodiumCol(
  podiumCol: number,
  cols: number,
  span: number = DEFAULT_PODIUM_SPAN
): number {
  const safeCols = Math.max(1, cols);
  const safeSpan = clampPodiumSpan(span, safeCols);
  const maxStart = maxPodiumCol(safeCols, safeSpan);
  const base = Number.isFinite(podiumCol)
    ? podiumCol
    : defaultPodiumCol(safeCols, safeSpan);
  return Math.min(Math.max(1, base), maxStart);
}

export function clampPodium(
  podiumCol: number,
  podiumSpan: number,
  cols: number
): { podiumCol: number; podiumSpan: number } {
  const safeCols = Math.max(1, cols);
  const safeSpan = clampPodiumSpan(podiumSpan, safeCols);
  const safeCol = clampPodiumCol(podiumCol, safeCols, safeSpan);
  return { podiumCol: safeCol, podiumSpan: safeSpan };
}

export function isPodiumColumn(
  col: number,
  podiumCol: number,
  podiumSpan: number
): boolean {
  const safeSpan = Math.max(1, podiumSpan);
  const start = podiumCol;
  return col >= start && col < start + safeSpan;
}

export interface SeatWithSelection {
  id: string;
  row: number;
  col: number;
  type: SeatType;
  selection?: {
    id: string;
    studentName: string;
    gender: Gender;
  } | null;
}

export interface ClassSeatState {
  classId: string;
  name?: string;
  rows: number;
  cols: number;
  podiumCol: number;
  podiumSpan: number;
  selectionOpen: boolean;
  seats: SeatWithSelection[];
}
