"use client";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className ?? "tap-target text-sm text-slate-500 hover:text-slate-800 active:opacity-70"}
    >
      退出登录
    </button>
  );
}
