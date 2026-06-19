"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { PodiumPositionControl } from "@/components/PodiumPositionControl";
import {
  clampPodium,
  defaultPodiumCol,
  DEFAULT_PODIUM_SPAN,
} from "@/lib/types";

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  rows: number;
  cols: number;
  selectionOpen: boolean;
  createdAt: string;
  _count: { seats: number; selections: number; inviteCodes: number };
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    rows: 6,
    cols: 8,
    podiumCol: defaultPodiumCol(8),
    podiumSpan: DEFAULT_PODIUM_SPAN,
  });
  const [error, setError] = useState("");
  const [teacherName, setTeacherName] = useState("");

  async function load() {
    const sessionRes = await fetch("/api/auth/session");
    const { session } = await sessionRes.json();
    if (!session || session.role !== "teacher") {
      router.push("/teacher/login");
      return;
    }
    setTeacherName(session.name ?? session.username);

    const res = await fetch("/api/teacher/classes");
    if (res.ok) {
      const data = await res.json();
      setClasses(data.classes);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/teacher/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "创建失败");
      return;
    }
    setShowForm(false);
    setForm({
      name: "",
      description: "",
      rows: 6,
      cols: 8,
      podiumCol: defaultPodiumCol(8),
      podiumSpan: DEFAULT_PODIUM_SPAN,
    });
    void load();
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">加载中...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">老师工作台</h1>
          <p className="text-sm text-slate-500">欢迎，{teacherName}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            首页
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 active:bg-blue-800"
        >
          {showForm ? "取消" : "新建班级"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createClass}
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold">新建班级</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              placeholder="班级名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2"
              required
            />
            <input
              placeholder="备注（可选）"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm">
              行数
              <input
                type="number"
                min={1}
                max={30}
                value={form.rows}
                onChange={(e) =>
                  setForm({ ...form, rows: Number(e.target.value) })
                }
                className="w-20 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              列数
              <input
                type="number"
                min={1}
                max={30}
                value={form.cols}
                onChange={(e) => {
                  const cols = Number(e.target.value);
                  const clamped = clampPodium(
                    form.podiumCol,
                    form.podiumSpan,
                    cols
                  );
                  setForm({
                    ...form,
                    cols,
                    podiumCol: clamped.podiumCol,
                    podiumSpan: clamped.podiumSpan,
                  });
                }}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-4">
            <PodiumPositionControl
              cols={form.cols}
              podiumCol={form.podiumCol}
              podiumSpan={form.podiumSpan}
              onChange={(podiumCol) => setForm({ ...form, podiumCol })}
              onSpanChange={(podiumSpan) =>
                setForm({ ...form, podiumSpan })
              }
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 active:bg-blue-800"
          >
            创建
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`/teacher/classes/${cls.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{cls.name}</h3>
                {cls.description && (
                  <p className="mt-1 text-sm text-slate-500">{cls.description}</p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  {cls.rows} 行 × {cls.cols} 列 · 已选 {cls._count.selections} ·
                  邀请码 {cls._count.inviteCodes}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  cls.selectionOpen
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {cls.selectionOpen ? "选座开放" : "已关闭"}
              </span>
            </div>
          </Link>
        ))}
        {classes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
            还没有班级，点击上方按钮创建
          </p>
        )}
      </div>
    </main>
  );
}
