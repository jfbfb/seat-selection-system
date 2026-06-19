import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <LoginForm
        role="admin"
        title="管理员登录"
        redirectTo="/admin"
      />
      <Link href="/" className="mt-6 text-sm text-slate-500 hover:text-slate-800">
        返回首页
      </Link>
    </main>
  );
}
