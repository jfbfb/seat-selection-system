/**
 * 学生选座页 /select/[code]
 *
 * 流程：加载邀请码 → 显示 SeatGrid → 选座填表 → POST 选座 → 跳转查看页
 * useClassEvents 负责实时同步其他人选座的结果
 */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SeatGrid, SeatGridSeat } from "@/components/SeatGrid";
import { useClassEvents } from "@/hooks/useClassEvents";
import type { ClassSeatState } from "@/lib/types";
import { formatSeatLabel } from "@/lib/types";

export default function SelectPage() {
  const params = useParams();
  const code = params.code as string;

  const [status, setStatus] = useState<
    "loading" | "ready" | "used" | "closed" | "error"
  >("loading");
  const [className, setClassName] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [seatState, setSeatState] = useState<ClassSeatState | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    viewUrl: string;
    duplicateWarning: boolean;
  } | null>(null);
  const [viewToken, setViewToken] = useState<string | null>(null);

  useClassEvents(classId, setSeatState);

  useEffect(() => {
    async function init() {
      const res = await fetch(`/api/select/${code}`);
      const data = await res.json();

      if (res.status === 404) {
        setStatus("error");
        setError("邀请码无效");
        return;
      }
      if (data.status === "used") {
        setStatus("used");
        setViewToken(data.viewToken);
        setClassName(data.className);
        return;
      }
      if (data.status === "closed" || !res.ok) {
        setStatus("closed");
        setError(data.error ?? "选座已关闭");
        return;
      }

      setStatus("ready");
      setClassName(data.className);
      setClassId(data.classId);
      setSeatState(data.seatState);
    }
    void init();
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSeatId) {
      setError("请先选择一个座位");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/select/${code}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatId: selectedSeatId,
          studentName,
          gender,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.code === "DUPLICATE_NAME") {
        if (confirm("同班已有相同姓名，确定继续选座吗？")) {
          const retry = await fetch(`/api/select/${code}/select`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              seatId: selectedSeatId,
              studentName,
              gender,
              allowDuplicateName: true,
            }),
          });
          const retryData = await retry.json();
          if (!retry.ok) {
            setError(retryData.error ?? "选座失败");
            return;
          }
          setSuccess({
            viewUrl: retryData.viewUrl,
            duplicateWarning: retryData.duplicateWarning,
          });
          setStatus("used");
          return;
        }
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "选座失败");
        if (data.code === "SEAT_TAKEN") setSelectedSeatId(null);
        return;
      }

      setSuccess({
        viewUrl: data.viewUrl,
        duplicateWarning: data.duplicateWarning,
      });
      setStatus("used");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-500">加载中...</p>
      </main>
    );
  }

  if (status === "error" || status === "closed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-medium text-slate-800">{error}</p>
        </div>
      </main>
    );
  }

  if (status === "used") {
    const url = success?.viewUrl ?? (viewToken ? `/view/${viewToken}` : "");
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mb-2 text-4xl">✓</div>
          <h1 className="text-xl font-bold text-slate-900">选座成功</h1>
          <p className="mt-2 text-sm text-slate-500">{className}</p>
          {success?.duplicateWarning && (
            <p className="mt-2 text-sm text-amber-600">
              提示：班内已有同名学生
            </p>
          )}
          {url && (
            <a
              href={url.startsWith("http") ? url : url}
              className="tap-target mt-6 block rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 active:bg-blue-800"
            >
              查看我的座位
            </a>
          )}
          <p className="mt-4 text-xs text-slate-400">
            请保存此链接，可随时查看座位信息
          </p>
        </div>
      </main>
    );
  }

  const seats: SeatGridSeat[] = seatState?.seats ?? [];
  const selectedSeat = seats.find((s) => s.id === selectedSeatId);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-center text-xl font-bold text-slate-900">
          {className}
        </h1>
        <p className="mb-4 text-center text-sm text-slate-500 sm:mb-6">请选择座位</p>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-6 sm:p-4">
          <SeatGrid
            rows={seatState?.rows ?? 0}
            cols={seatState?.cols ?? 0}
            seats={seats}
            mode="select"
            showOccupantInfo
            podiumCol={seatState?.podiumCol}
            podiumSpan={seatState?.podiumSpan}
            selectedSeatId={selectedSeatId}
            onSeatClick={(seat) => {
              if (seat.type === "normal" && !seat.selection) {
                setSelectedSeatId(seat.id);
                setError("");
              }
            }}
          />
          <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50" />
              可选
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-blue-300 bg-blue-50" />
              已占
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          {selectedSeat && (
            <p className="mb-4 text-center text-sm font-medium text-blue-700">
              已选：{formatSeatLabel(selectedSeat.row, selectedSeat.col)}
            </p>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">姓名</label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
                placeholder="请输入姓名"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">性别</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["male", "男"],
                    ["female", "女"],
                    ["other", "其他"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGender(value)}
                    className={`rounded-lg border py-3 text-sm font-medium transition-colors ${
                      gender === value
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !selectedSeatId}
            className="mt-4 w-full rounded-lg bg-blue-600 py-3.5 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
          >
            {submitting ? "提交中..." : "确认选座"}
          </button>
        </form>
      </div>
    </main>
  );
}
