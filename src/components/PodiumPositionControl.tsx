"use client";

import {
  clampPodium,
  clampPodiumCol,
  clampPodiumSpan,
  isPodiumColumn,
  maxPodiumCol,
} from "@/lib/types";

interface PodiumPositionControlProps {
  cols: number;
  podiumCol: number;
  podiumSpan: number;
  onChange: (podiumCol: number) => void;
  onSpanChange: (podiumSpan: number) => void;
  disabled?: boolean;
}

export function PodiumPositionControl({
  cols,
  podiumCol,
  podiumSpan,
  onChange,
  onSpanChange,
  disabled = false,
}: PodiumPositionControlProps) {
  const { podiumCol: safeCol, podiumSpan: safeSpan } = clampPodium(
    podiumCol,
    podiumSpan,
    cols
  );
  const maxCol = maxPodiumCol(cols, safeSpan);

  function move(delta: number) {
    if (!Number.isFinite(cols) || cols < 1) return;
    onChange(clampPodiumCol(safeCol + delta, cols, safeSpan));
  }

  function changeSpan(delta: number) {
    if (!Number.isFinite(cols) || cols < 1) return;
    const nextSpan = clampPodiumSpan(safeSpan + delta, cols);
    const { podiumCol: nextCol } = clampPodium(safeCol, nextSpan, cols);
    onSpanChange(nextSpan);
    if (nextCol !== safeCol) {
      onChange(nextCol);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-600">
          讲台：第 {safeCol}
          {safeSpan > 1 ? `–${safeCol + safeSpan - 1}` : ""} 列（宽 {safeSpan}{" "}
          列，黑板方向）
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">位置</span>
          <button
            type="button"
            disabled={disabled || safeCol <= 1}
            onClick={() => move(-1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40"
          >
            ←
          </button>
          <button
            type="button"
            disabled={disabled || safeCol >= maxCol}
            onClick={() => move(1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40"
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">宽度</span>
          <button
            type="button"
            disabled={disabled || safeSpan <= 1}
            onClick={() => changeSpan(-1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            disabled={disabled || safeSpan >= cols}
            onClick={() => changeSpan(1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: cols }, (_, i) => {
          const col = i + 1;
          const isPodium = isPodiumColumn(col, safeCol, safeSpan);
          return (
            <div
              key={col}
              className={`h-2 flex-1 rounded-full ${
                isPodium ? "bg-slate-500" : "bg-slate-200"
              }`}
              title={
                isPodium
                  ? `讲台：第 ${safeCol}${safeSpan > 1 ? `–${safeCol + safeSpan - 1}` : ""} 列`
                  : `第 ${col} 列`
              }
            />
          );
        })}
      </div>
    </div>
  );
}
