"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SeatType } from "@prisma/client";
import { SeatGrid, SeatGridSeat } from "@/components/SeatGrid";
import { PodiumPositionControl } from "@/components/PodiumPositionControl";
import { useClassEvents } from "@/hooks/useClassEvents";
import type { ClassSeatState } from "@/lib/types";
import {
  formatSeatLabel,
  GENDER_LABELS,
  defaultPodiumCol,
  clampPodium,
  clampPodiumCol,
  DEFAULT_PODIUM_SPAN,
} from "@/lib/types";

interface Selection {
  id: string;
  studentName: string;
  gender: string;
  viewToken: string;
  seat: { row: number; col: number };
  inviteCode: { code: string };
}

interface InviteCodeItem {
  id: string;
  code: string;
  status: string;
  url: string;
  usedAt: string | null;
  selection?: {
    studentName: string;
    seat: { row: number; col: number };
  } | null;
}

type Tab = "overview" | "layout" | "codes" | "students";

const SEAT_CYCLE: SeatType[] = ["normal", "aisle", "empty"];

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [tab, setTab] = useState<Tab>("overview");
  const [classInfo, setClassInfo] = useState<{
    name: string;
    description: string | null;
    rows: number;
    cols: number;
    podiumCol: number;
    podiumSpan: number;
    selectionOpen: boolean;
  } | null>(null);
  const [seatState, setSeatState] = useState<ClassSeatState | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [codes, setCodes] = useState<InviteCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resize, setResize] = useState({ rows: 6, cols: 8 });
  const [moveMode, setMoveMode] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ studentName: "", gender: "male" });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");

  const onSeatUpdate = useCallback((state: ClassSeatState) => {
    setSeatState((prev) =>
      prev
        ? {
            ...state,
            podiumCol: prev.podiumCol,
            podiumSpan: prev.podiumSpan,
          }
        : state
    );
    setClassInfo((prev) =>
      prev ? { ...prev, selectionOpen: state.selectionOpen } : prev
    );
  }, []);

  useClassEvents(classId, onSeatUpdate);

  async function load() {
    const sessionRes = await fetch("/api/auth/session");
    const { session } = await sessionRes.json();
    if (!session || session.role !== "teacher") {
      router.push("/teacher/login");
      return;
    }

    const res = await fetch(`/api/teacher/classes/${classId}`);
    if (!res.ok) {
      router.push("/teacher");
      return;
    }
    const data = await res.json();
    setClassInfo({
      ...data.class,
      podiumCol:
        data.class.podiumCol ?? defaultPodiumCol(data.class.cols),
      podiumSpan: data.class.podiumSpan ?? DEFAULT_PODIUM_SPAN,
    });
    setSeatState(
      data.seatState
        ? {
            ...data.seatState,
            podiumCol:
              data.seatState.podiumCol ??
              data.class.podiumCol ??
              defaultPodiumCol(data.class.cols),
            podiumSpan:
              data.seatState.podiumSpan ??
              data.class.podiumSpan ??
              DEFAULT_PODIUM_SPAN,
          }
        : data.seatState
    );
    setSelections(data.selections);
    setResize({ rows: data.class.rows, cols: data.class.cols });
    setLoading(false);
  }

  async function loadCodes() {
    const res = await fetch(`/api/teacher/classes/${classId}/invite-codes`);
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEffect(() => {
    if (tab === "codes") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, classId]);

  async function toggleSelectionOpen() {
    if (!classInfo) return;
    await fetch(`/api/teacher/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectionOpen: !classInfo.selectionOpen }),
    });
    void load();
  }

  async function generateCode() {
    const res = await fetch(`/api/teacher/classes/${classId}/invite-codes`, {
      method: "POST",
    });
    if (res.ok) void loadCodes();
  }

  async function copyText(text: string, key: string) {
    setCopyError("");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!ok) throw new Error("copy failed");
      }

      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      setCopyError("复制失败，请手动选择复制");
      window.setTimeout(() => setCopyError(""), 3000);
    }
  }

  async function updatePodiumCol(podiumCol: number) {
    if (!classInfo) return;
    const nextCol = clampPodiumCol(
      podiumCol,
      classInfo.cols,
      classInfo.podiumSpan
    );

    setClassInfo((prev) =>
      prev ? { ...prev, podiumCol: nextCol } : prev
    );
    setSeatState((prev) =>
      prev ? { ...prev, podiumCol: nextCol } : prev
    );

    const res = await fetch(`/api/teacher/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podiumCol: nextCol }),
    });

    if (!res.ok) {
      void load();
      return;
    }

    const data = await res.json();
    const saved = clampPodium(
      Number.isFinite(data.class?.podiumCol)
        ? data.class.podiumCol
        : nextCol,
      data.class?.podiumSpan ?? classInfo.podiumSpan,
      classInfo.cols
    );
    setClassInfo((prev) =>
      prev
        ? { ...prev, podiumCol: saved.podiumCol, podiumSpan: saved.podiumSpan }
        : prev
    );
    setSeatState((prev) =>
      prev
        ? { ...prev, podiumCol: saved.podiumCol, podiumSpan: saved.podiumSpan }
        : prev
    );
  }

  async function updatePodiumSpan(podiumSpan: number) {
    if (!classInfo) return;
    const saved = clampPodium(
      classInfo.podiumCol,
      podiumSpan,
      classInfo.cols
    );

    setClassInfo((prev) =>
      prev
        ? {
            ...prev,
            podiumCol: saved.podiumCol,
            podiumSpan: saved.podiumSpan,
          }
        : prev
    );
    setSeatState((prev) =>
      prev
        ? {
            ...prev,
            podiumCol: saved.podiumCol,
            podiumSpan: saved.podiumSpan,
          }
        : prev
    );

    const res = await fetch(`/api/teacher/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        podiumSpan: saved.podiumSpan,
        podiumCol: saved.podiumCol,
      }),
    });

    if (!res.ok) {
      void load();
      return;
    }

    const data = await res.json();
    const confirmed = clampPodium(
      Number.isFinite(data.class?.podiumCol)
        ? data.class.podiumCol
        : saved.podiumCol,
      data.class?.podiumSpan ?? saved.podiumSpan,
      classInfo.cols
    );
    setClassInfo((prev) =>
      prev
        ? {
            ...prev,
            podiumCol: confirmed.podiumCol,
            podiumSpan: confirmed.podiumSpan,
          }
        : prev
    );
    setSeatState((prev) =>
      prev
        ? {
            ...prev,
            podiumCol: confirmed.podiumCol,
            podiumSpan: confirmed.podiumSpan,
          }
        : prev
    );
  }

  async function handleSeatEdit(seat: SeatGridSeat) {
    if (seat.type === "normal" && seat.selection) return;
    const idx = SEAT_CYCLE.indexOf(seat.type);
    const nextType = SEAT_CYCLE[(idx + 1) % SEAT_CYCLE.length];
    const res = await fetch(
      `/api/teacher/classes/${classId}/seats/${seat.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: nextType }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "更新失败");
      return;
    }
    void load();
  }

  async function applyResize() {
    const res = await fetch(`/api/teacher/classes/${classId}/layout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resize),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "调整失败");
      return;
    }
    void load();
  }

  async function handleMoveClick(seat: SeatGridSeat) {
    if (!moveMode) return;
    if (seat.id === moveMode) {
      setMoveMode(null);
      return;
    }
    if (seat.type !== "normal" || seat.selection) return;

    const res = await fetch(
      `/api/teacher/classes/${classId}/selections/${moveMode}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSeatId: seat.id }),
      }
    );
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "换座失败");
      return;
    }
    setMoveMode(null);
    void load();
  }

  async function saveEdit(selectionId: string, allowDuplicate = false) {
    const res = await fetch(
      `/api/teacher/classes/${classId}/selections/${selectionId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, allowDuplicateName: allowDuplicate }),
      }
    );
    const data = await res.json();
    if (res.status === 409 && data.code === "DUPLICATE_NAME") {
      if (confirm("同班已有相同姓名，确定继续保存吗？")) {
        void saveEdit(selectionId, true);
      }
      return;
    }
    if (!res.ok) {
      alert(data.error ?? "保存失败");
      return;
    }
    setEditingId(null);
    void load();
  }

  if (loading || !classInfo || !seatState) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">加载中...</p>
      </main>
    );
  }

  const gridSeats: SeatGridSeat[] = seatState.seats;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <div className="no-print mb-6">
        <Link
          href="/teacher"
          className="text-sm text-blue-600 hover:underline"
        >
          ← 返回班级列表
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{classInfo.name}</h1>
            {classInfo.description && (
              <p className="text-sm text-slate-500">{classInfo.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleSelectionOpen}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                classInfo.selectionOpen
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {classInfo.selectionOpen ? "关闭选座" : "开放选座"}
            </button>
            <a
              href={`/api/teacher/classes/${classId}/export`}
              className="tap-target rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100"
            >
              导出 Excel
            </a>
            <Link
              href={`/teacher/classes/${classId}/print`}
              className="tap-target rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100"
            >
              打印
            </Link>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {(
            [
              ["overview", "总览"],
              ["layout", "布局编辑"],
              ["codes", "邀请码"],
              ["students", "学生管理"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${
                tab === key
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded border border-emerald-300 bg-emerald-50" />
              空座
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded border border-blue-300 bg-blue-50" />
              已占
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-4 w-4 rounded bg-slate-100" />
              过道
            </span>
          </div>
          <SeatGrid
            rows={classInfo.rows}
            cols={classInfo.cols}
            seats={gridSeats}
            mode="view"
            showOccupantInfo
            podiumCol={classInfo.podiumCol}
            podiumSpan={classInfo.podiumSpan}
          />
        </section>
      )}

      {tab === "layout" && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <p className="mb-4 text-sm text-slate-600">
              点击座位切换：座位 → 过道 → 空位 → 座位。有人的座位需先移走。
            </p>
            <SeatGrid
              rows={classInfo.rows}
              cols={classInfo.cols}
              seats={gridSeats}
              mode="edit"
              podiumCol={classInfo.podiumCol}
              podiumSpan={classInfo.podiumSpan}
              onSeatClick={handleSeatEdit}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-3 font-semibold">讲台位置与宽度</h3>
            <PodiumPositionControl
              cols={classInfo.cols}
              podiumCol={classInfo.podiumCol}
              podiumSpan={classInfo.podiumSpan}
              onChange={updatePodiumCol}
              onSpanChange={updatePodiumSpan}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-3 font-semibold">调整网格大小</h3>
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm">
                行
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={resize.rows}
                  onChange={(e) =>
                    setResize({ ...resize, rows: Number(e.target.value) })
                  }
                  className="ml-2 w-16 rounded border px-2 py-1"
                />
              </label>
              <label className="text-sm">
                列
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={resize.cols}
                  onChange={(e) =>
                    setResize({ ...resize, cols: Number(e.target.value) })
                  }
                  className="ml-2 w-16 rounded border px-2 py-1"
                />
              </label>
              <button
                type="button"
                onClick={applyResize}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 active:bg-blue-800"
              >
                应用
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "codes" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
            <h3 className="font-semibold">邀请码</h3>
            <button
              type="button"
              onClick={generateCode}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 active:bg-blue-800"
            >
              生成一个
            </button>
          </div>
          {copyError && (
            <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-700 sm:px-6">
              {copyError}
            </p>
          )}
          <div className="divide-y divide-slate-100">
            {codes.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
              >
                <div>
                  <code className="font-mono text-sm font-semibold">{c.code}</code>
                  <span
                    className={`ml-2 text-xs ${
                      c.status === "used" ? "text-slate-400" : "text-emerald-600"
                    }`}
                  >
                    {c.status === "used" ? "已使用" : "未使用"}
                  </span>
                  {c.selection && (
                    <p className="text-sm text-slate-500">
                      {c.selection.studentName} ·{" "}
                      {formatSeatLabel(
                        c.selection.seat.row,
                        c.selection.seat.col
                      )}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(c.code, `${c.id}-code`)}
                    className={`rounded border px-2 py-1 text-xs transition-colors hover:bg-slate-50 active:bg-slate-100 ${
                      copiedKey === `${c.id}-code`
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {copiedKey === `${c.id}-code` ? "已复制" : "复制码"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(c.url, `${c.id}-url`)}
                    className={`rounded border px-2 py-1 text-xs transition-colors hover:bg-slate-50 active:bg-slate-100 ${
                      copiedKey === `${c.id}-url`
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {copiedKey === `${c.id}-url` ? "已复制" : "复制链接"}
                  </button>
                </div>
              </div>
            ))}
            {codes.length === 0 && (
              <p className="px-6 py-8 text-center text-slate-500">
                暂无邀请码，点击上方生成
              </p>
            )}
          </div>
        </section>
      )}

      {tab === "students" && (
        <section className="space-y-4">
          {moveMode && (
            <p className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
              换座模式：请点击目标空座位
              <button
                type="button"
                className="ml-3 underline hover:text-blue-700"
                onClick={() => setMoveMode(null)}
              >
                取消
              </button>
            </p>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <SeatGrid
              rows={classInfo.rows}
              cols={classInfo.cols}
              seats={gridSeats}
              mode={moveMode ? "move" : "view"}
              showOccupantInfo={!moveMode}
              podiumCol={classInfo.podiumCol}
              podiumSpan={classInfo.podiumSpan}
              selectedSeatId={
                moveMode
                  ? gridSeats.find((g) => g.selection?.id === moveMode)?.id ??
                    null
                  : null
              }
              onSeatClick={moveMode ? handleMoveClick : undefined}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {selections.map((s) => (
              <div
                key={s.id}
                className="border-b border-slate-100 px-4 py-4 last:border-0 sm:px-6"
              >
                {editingId === s.id ? (
                  <div className="space-y-3">
                    <input
                      value={editForm.studentName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, studentName: e.target.value })
                      }
                      className="w-full rounded border px-3 py-2"
                    />
                    <select
                      value={editForm.gender}
                      onChange={(e) =>
                        setEditForm({ ...editForm, gender: e.target.value })
                      }
                      className="rounded border px-3 py-2"
                    >
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="other">其他</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(s.id)}
                        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 active:bg-blue-800"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border bg-white px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{s.studentName}</div>
                      <div className="text-sm text-slate-500">
                        {GENDER_LABELS[s.gender as keyof typeof GENDER_LABELS]} ·{" "}
                        {formatSeatLabel(s.seat.row, s.seat.col)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(s.id);
                          setEditForm({
                            studentName: s.studentName,
                            gender: s.gender,
                          });
                        }}
                        className="border rounded px-2 py-1 text-xs hover:bg-slate-50 active:bg-slate-100"
                      >
                        改信息
                      </button>
                      <button
                        type="button"
                        onClick={() => setMoveMode(s.id)}
                        className="border rounded px-2 py-1 text-xs hover:bg-slate-50 active:bg-slate-100"
                      >
                        换座
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {selections.length === 0 && (
              <p className="px-6 py-8 text-center text-slate-500">暂无选座记录</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
