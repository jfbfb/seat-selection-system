"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

interface Teacher {
  id: string;
  username: string;
  name: string;
  active: boolean;
  createdAt: string;
  _count: { classes: number };
}

export default function AdminPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  async function loadTeachers() {
    const sessionRes = await fetch("/api/auth/session");
    const { session } = await sessionRes.json();
    if (!session || session.role !== "admin") {
      router.push("/admin/login");
      return;
    }

    const res = await fetch("/api/admin/teachers");
    if (res.ok) {
      const data = await res.json();
      setTeachers(data.teachers);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Data fetch on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "创建失败");
      return;
    }
    setForm({ username: "", password: "", name: "" });
    setShowCreatePassword(false);
    void loadTeachers();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/teachers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    void loadTeachers();
  }

  async function submitResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;

    if (resetPassword.length < 6) {
      setResetError("密码至少 6 位");
      return;
    }

    setResetError("");
    setResetSuccess("");
    setResetting(true);

    try {
      const res = await fetch(`/api/admin/teachers/${resetTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResetError(data.error ?? "重置失败");
        return;
      }

      setResetSuccess(`已为 ${resetTarget.name} 重置密码`);
      setResetPassword("");
      setResetTarget(null);
    } catch {
      setResetError("网络错误，请重试");
    } finally {
      setResetting(false);
    }
  }

  function openResetDialog(teacher: Teacher) {
    setResetTarget(teacher);
    setResetPassword("");
    setResetError("");
    setResetSuccess("");
    setShowResetPassword(false);
  }

  function closeResetDialog() {
    setResetTarget(null);
    setResetPassword("");
    setResetError("");
    setShowResetPassword(false);
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
          <h1 className="text-2xl font-bold">管理员后台</h1>
          <p className="text-sm text-slate-500">管理老师账号</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            首页
          </Link>
          <LogoutButton />
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">新增老师</h2>
        <form onSubmit={createTeacher} className="grid gap-4 sm:grid-cols-3">
          <input
            placeholder="用户名"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <input
            placeholder="姓名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2"
            required
          />
          <div className="relative">
            <input
              type={showCreatePassword ? "text" : "password"}
              placeholder="密码（至少6位）"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowCreatePassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200"
            >
              {showCreatePassword ? "隐藏" : "显示"}
            </button>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 active:bg-blue-800 sm:col-span-3 sm:w-fit"
          >
            创建老师
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {resetSuccess && (
          <p className="mt-2 text-sm text-emerald-600">{resetSuccess}</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-lg font-semibold">
          老师列表
        </h2>
        <div className="divide-y divide-slate-100">
          {teachers.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
            >
              <div>
                <div className="font-medium">
                  {t.name}{" "}
                  <span className="text-sm text-slate-400">@{t.username}</span>
                </div>
                <div className="text-sm text-slate-500">
                  {t._count.classes} 个班级 ·{" "}
                  {t.active ? "正常" : "已禁用"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openResetDialog(t)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100"
                >
                  重置密码
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(t.id, t.active)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 active:bg-slate-100"
                >
                  {t.active ? "禁用" : "启用"}
                </button>
              </div>
            </div>
          ))}
          {teachers.length === 0 && (
            <p className="px-6 py-8 text-center text-slate-500">暂无老师</p>
          )}
        </div>
      </section>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">重置密码</h3>
            <p className="mt-1 text-sm text-slate-500">
              为 {resetTarget.name}（@{resetTarget.username}）设置新密码
            </p>
            <form onSubmit={submitResetPassword} className="mt-4 space-y-4">
              <div className="relative">
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="新密码（至少6位）"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16"
                  minLength={6}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200"
                >
                  {showResetPassword ? "隐藏" : "显示"}
                </button>
              </div>
              {resetError && (
                <p className="text-sm text-red-600">{resetError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeResetDialog}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 active:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60"
                >
                  {resetting ? "保存中..." : "确认重置"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
