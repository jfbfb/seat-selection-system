"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SeatGrid, SeatGridSeat } from "@/components/SeatGrid";
import { useClassEvents } from "@/hooks/useClassEvents";
import type { ClassSeatState } from "@/lib/types";

interface ViewData {
  classId: string;
  className: string;
  mySeatId: string;
  studentName: string;
  genderLabel: string;
  seatLabel: string;
  createdAt: string;
  seatState: ClassSeatState;
}

export default function ViewPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ViewData | null>(null);
  const [seatState, setSeatState] = useState<ClassSeatState | null>(null);
  const [error, setError] = useState("");

  const onSeatUpdate = useCallback((state: ClassSeatState) => {
    setSeatState(state);
  }, []);

  useClassEvents(data?.classId ?? null, onSeatUpdate);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/view/${token}`);
      if (!res.ok) {
        setError("链接无效或已失效");
        return;
      }
      const json = await res.json();
      setData(json);
      setSeatState(json.seatState);
    }
    void load();
  }, [token]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-600">{error}</p>
      </main>
    );
  }

  if (!data || !seatState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-500">加载中...</p>
      </main>
    );
  }

  const gridSeats: SeatGridSeat[] = seatState.seats;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-center text-sm text-slate-500">{data.className}</p>
        <h1 className="mt-1 text-center text-xl font-bold text-slate-900">
          座位总览
        </h1>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">我的座位</p>
              <p className="text-lg font-bold text-blue-700">{data.seatLabel}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-slate-900">{data.studentName}</p>
              <p className="text-sm text-slate-500">{data.genderLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded border border-emerald-300 bg-emerald-50" />
              空座
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded border border-blue-300 bg-blue-50" />
              已占
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded border-2 border-blue-500 bg-blue-50" />
              我的座位
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded bg-slate-100" />
              过道
            </span>
          </div>

          <SeatGrid
            rows={seatState.rows}
            cols={seatState.cols}
            seats={gridSeats}
            mode="view"
            showOccupantInfo
            highlightSeatId={data.mySeatId}
            podiumCol={seatState.podiumCol}
            podiumSpan={seatState.podiumSpan}
          />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          仅供查看，如需修改请联系老师
        </p>
        <p className="mt-1 text-center text-xs text-slate-400">
          选座时间：{new Date(data.createdAt).toLocaleString("zh-CN")}
        </p>
      </div>
    </main>
  );
}
