import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <h1 className="mb-3 text-3xl font-bold text-slate-900">座位选择系统</h1>
        <p className="mb-10 text-slate-600">
          老师创建座位表并发放邀请码，学生选座后可持续查看座位信息
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/teacher/login"
            className="tap-target rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm transition hover:border-blue-300 hover:bg-slate-50 hover:shadow-md active:bg-slate-100"
          >
            <div className="text-lg font-semibold text-slate-900">老师端</div>
            <p className="mt-2 text-sm text-slate-500">管理班级与座位</p>
          </Link>
          <Link
            href="/admin/login"
            className="tap-target rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm transition hover:border-blue-300 hover:bg-slate-50 hover:shadow-md active:bg-slate-100"
          >
            <div className="text-lg font-semibold text-slate-900">管理员</div>
            <p className="mt-2 text-sm text-slate-500">创建老师账号</p>
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          学生请使用老师发放的邀请链接进入选座
        </p>
      </div>
    </main>
  );
}
