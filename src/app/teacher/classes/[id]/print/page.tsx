"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SeatGrid, SeatGridSeat } from "@/components/SeatGrid";
import { formatSeatLabel, GENDER_LABELS, DEFAULT_PODIUM_SPAN } from "@/lib/types";

export default function PrintPage() {
  const params = useParams();
  const classId = params.id as string;
  const [className, setClassName] = useState("");
  const [seats, setSeats] = useState<SeatGridSeat[]>([]);
  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);
  const [podiumCol, setPodiumCol] = useState(1);
  const [podiumSpan, setPodiumSpan] = useState(DEFAULT_PODIUM_SPAN);
  const [selections, setSelections] = useState<
    { studentName: string; gender: string; seat: { row: number; col: number } }[]
  >([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/teacher/classes/${classId}`);
      if (!res.ok) return;
      const data = await res.json();
      setClassName(data.class.name);
      setRows(data.class.rows);
      setCols(data.class.cols);
      setPodiumCol(data.class.podiumCol ?? Math.ceil(data.class.cols / 2));
      setPodiumSpan(data.class.podiumSpan ?? DEFAULT_PODIUM_SPAN);
      setSeats(data.seatState.seats);
      setSelections(data.selections);
    }
    void load();
  }, [classId]);

  return (
    <main className="print-page mx-auto max-w-4xl px-4 py-8">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/teacher/classes/${classId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← 返回
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="tap-target rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 active:bg-blue-800"
        >
          打印
        </button>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold">{className}</h1>
      <p className="mb-8 text-center text-sm text-slate-500">座位表</p>

      <div className="mb-10 flex justify-center">
        <SeatGrid
          rows={rows}
          cols={cols}
          seats={seats}
          mode="view"
          compact
          podiumCol={podiumCol}
          podiumSpan={podiumSpan}
        />
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="py-2 text-left">座位</th>
            <th className="py-2 text-left">姓名</th>
            <th className="py-2 text-left">性别</th>
          </tr>
        </thead>
        <tbody>
          {selections.map((s, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2">
                {formatSeatLabel(s.seat.row, s.seat.col)}
              </td>
              <td className="py-2">{s.studentName}</td>
              <td className="py-2">
                {GENDER_LABELS[s.gender as keyof typeof GENDER_LABELS]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
