"use client";

import { useEffect, useState } from "react";
import { SeatType } from "@prisma/client";
import {
  formatSeatLabel,
  GENDER_LABELS,
  getGridDensity,
  truncateName,
  defaultPodiumCol,
  clampPodium,
  DEFAULT_PODIUM_SPAN,
  type GridDensity,
} from "@/lib/types";
import { Gender } from "@prisma/client";

export interface SeatGridSeat {
  id: string;
  row: number;
  col: number;
  type: SeatType;
  selection?: {
    id: string;
    studentName: string;
    gender: string;
  } | null;
}

interface SeatGridProps {
  rows: number;
  cols: number;
  seats: SeatGridSeat[];
  mode: "view" | "select" | "edit" | "move";
  selectedSeatId?: string | null;
  moveTargetSeatId?: string | null;
  highlightSeatId?: string | null;
  showOccupantInfo?: boolean;
  podiumCol?: number;
  podiumSpan?: number;
  onSeatClick?: (seat: SeatGridSeat) => void;
  compact?: boolean;
}

const MOBILE_CELL =
  "aspect-square w-full min-w-0 min-h-0 p-0.5 text-[10px] leading-tight";

const DENSITY_STYLES: Record<
  GridDensity,
  { cell: string; name: string; gender: string }
> = {
  large: {
    cell: "min-h-[3.5rem] min-w-[4.5rem] px-1 py-1 text-xs sm:aspect-auto sm:min-h-[3.5rem] sm:min-w-[4.5rem]",
    name: "text-xs font-medium leading-tight",
    gender: "text-[10px] leading-tight opacity-80",
  },
  medium: {
    cell: "min-h-[3rem] min-w-[3.5rem] px-0.5 py-0.5 text-[11px] sm:aspect-auto sm:min-h-[3rem] sm:min-w-[3.5rem]",
    name: "text-[11px] font-medium leading-tight",
    gender: "text-[9px] leading-tight opacity-80",
  },
  compact: {
    cell: "aspect-square w-full min-w-0 min-h-0 p-0.5 text-[10px] sm:h-14 sm:w-14 sm:min-w-[3.5rem] sm:aspect-auto sm:text-sm",
    name: "text-[10px] leading-tight sm:text-xs",
    gender: "hidden",
  },
};

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function getColumnTemplate(
  cols: number,
  seats: SeatGridSeat[],
  isMobile: boolean
): string {
  if (!isMobile) {
    return `repeat(${cols}, minmax(0, 1fr))`;
  }

  const aisleCols = new Set<number>();
  for (const seat of seats) {
    if (seat.type === "aisle") aisleCols.add(seat.col);
  }

  return Array.from({ length: cols }, (_, i) => {
    const col = i + 1;
    if (aisleCols.has(col)) return "minmax(1rem, 0.4fr)";
    return "minmax(0, 1fr)";
  }).join(" ");
}

function seatClass(
  seat: SeatGridSeat,
  mode: SeatGridProps["mode"],
  selectedSeatId?: string | null,
  moveTargetSeatId?: string | null,
  highlightSeatId?: string | null
): string {
  const base =
    "flex flex-col items-center justify-center rounded-md border text-center transition-colors";

  const isHighlighted = highlightSeatId === seat.id;

  if (seat.type === "aisle") {
    return `${base} border-transparent bg-slate-100 text-slate-400 ${mode === "edit" ? "cursor-pointer hover:bg-slate-200 active:bg-slate-300" : ""}`;
  }
  if (seat.type === "empty") {
    return `${base} border-dashed border-slate-200 bg-white text-slate-300 ${mode === "edit" ? "cursor-pointer hover:border-slate-400 active:bg-slate-50" : ""}`;
  }

  const occupied = !!seat.selection;
  const isSelected = selectedSeatId === seat.id;
  const isMoveTarget = moveTargetSeatId === seat.id;
  const highlightRing = isHighlighted ? " ring-2 ring-blue-500 ring-offset-1" : "";

  if (mode === "select") {
    if (occupied) {
      return `${base} cursor-not-allowed border-blue-200 bg-blue-50 text-blue-800${highlightRing}`;
    }
    if (isSelected) {
      return `${base} cursor-pointer border-blue-600 bg-blue-100 text-blue-800 ring-2 ring-blue-400`;
    }
    return `${base} cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95`;
  }

  if (mode === "move") {
    if (occupied && !isSelected) {
      return `${base} border-amber-300 bg-amber-50 text-amber-800${highlightRing}`;
    }
    if (isSelected) {
      return `${base} border-blue-600 bg-blue-100 text-blue-800 ring-2 ring-blue-400`;
    }
    if (isMoveTarget) {
      return `${base} cursor-pointer border-green-600 bg-green-100 text-green-800`;
    }
    if (!occupied) {
      return `${base} cursor-pointer border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200`;
    }
  }

  if (occupied) {
    return `${base} border-blue-300 bg-blue-50 text-blue-800${highlightRing} ${mode === "edit" ? "cursor-pointer" : ""}`;
  }

  return `${base} border-slate-200 bg-white text-slate-500 ${mode === "edit" ? "cursor-pointer hover:border-blue-400 active:bg-slate-50" : ""}`;
}

function renderOccupantContent(
  seat: SeatGridSeat,
  density: GridDensity,
  showOccupantInfo: boolean,
  isMobile: boolean
) {
  if (!seat.selection) return null;

  const genderLabel =
    GENDER_LABELS[seat.selection.gender as Gender] ?? seat.selection.gender;
  const fullTitle = `${seat.selection.studentName}（${genderLabel}）`;

  if (isMobile || !showOccupantInfo) {
    const maxLen = isMobile ? 3 : density === "compact" ? 2 : 4;
    return {
      title: fullTitle,
      content: (
        <span className={isMobile ? "text-[10px] leading-tight" : DENSITY_STYLES[density].name}>
          {truncateName(seat.selection.studentName, maxLen)}
        </span>
      ),
    };
  }

  const nameDisplay =
    density === "compact"
      ? truncateName(seat.selection.studentName, 4)
      : seat.selection.studentName;

  return {
    title: fullTitle,
    content: (
      <>
        <span className={DENSITY_STYLES[density].name}>{nameDisplay}</span>
        {density !== "compact" && (
          <span className={DENSITY_STYLES[density].gender}>{genderLabel}</span>
        )}
      </>
    ),
  };
}

export function SeatGrid({
  rows,
  cols,
  seats,
  mode,
  selectedSeatId,
  moveTargetSeatId,
  highlightSeatId,
  showOccupantInfo = false,
  podiumCol: podiumColProp,
  podiumSpan: podiumSpanProp,
  onSeatClick,
  compact = false,
}: SeatGridProps) {
  const isMobile = useIsMobile();
  const seatMap = new Map(seats.map((s) => [`${s.row}-${s.col}`, s]));
  const density = compact
    ? "compact"
    : getGridDensity(rows, cols, isMobile);
  const cellSize = isMobile ? MOBILE_CELL : DENSITY_STYLES[density].cell;
  const useShortLabel = compact || isMobile;
  const gridGap = isMobile ? "gap-1" : "gap-1.5";
  const columnTemplate = getColumnTemplate(cols, seats, isMobile);
  const { podiumCol, podiumSpan } = clampPodium(
    podiumColProp ?? defaultPodiumCol(cols, podiumSpanProp),
    podiumSpanProp ?? DEFAULT_PODIUM_SPAN,
    cols
  );

  return (
    <div className={isMobile ? "w-full" : "overflow-x-auto"}>
      <div className="w-full">
        <div
          className={`grid w-full ${gridGap}`}
          style={{ gridTemplateColumns: columnTemplate }}
        >
          {Array.from({ length: cols }, (_, colIdx) => {
            const col = colIdx + 1;
            if (col === podiumCol) {
              return (
                <div
                  key="podium"
                  style={{ gridColumn: `${podiumCol} / span ${podiumSpan}` }}
                  className={`${cellSize} flex items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-center text-xs font-medium text-slate-600`}
                >
                  讲台
                </div>
              );
            }
            if (col > podiumCol && col < podiumCol + podiumSpan) {
              return null;
            }
            return <div key={`podium-gap-${col}`} className={cellSize} />;
          })}

          {Array.from({ length: rows }, (_, rowIdx) => {
            const row = rowIdx + 1;
            return Array.from({ length: cols }, (_, colIdx) => {
              const col = colIdx + 1;
              const seat = seatMap.get(`${row}-${col}`);
              if (!seat) {
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`${cellSize} rounded-md border border-dashed border-slate-100`}
                  />
                );
              }

              const label =
                seat.type === "normal"
                  ? useShortLabel
                    ? `${seat.row}-${seat.col}`
                    : formatSeatLabel(seat.row, seat.col)
                        .replace("排", "-")
                        .replace("列", "")
                  : seat.type === "aisle"
                    ? "道"
                    : "";

              const defaultTitle =
                seat.type === "aisle"
                  ? "过道"
                  : seat.type === "empty"
                    ? "空位"
                    : formatSeatLabel(seat.row, seat.col);

              const occupant = seat.selection
                ? renderOccupantContent(
                    seat,
                    density,
                    showOccupantInfo,
                    isMobile
                  )
                : null;

              const title = occupant?.title ?? defaultTitle;

              return (
                <button
                  key={seat.id}
                  type="button"
                  title={title}
                  disabled={
                    mode === "select" &&
                    (seat.type !== "normal" || !!seat.selection)
                  }
                  onClick={() => onSeatClick?.(seat)}
                  className={`${cellSize} ${seatClass(seat, mode, selectedSeatId, moveTargetSeatId, highlightSeatId)}`}
                >
                  {occupant ? occupant.content : <span className="leading-tight">{label}</span>}
                </button>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
