"use client";

import { useRouter } from "next/navigation";
import { LOGIN_PATH } from "@/lib/config";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="cursor-pointer rounded-lg border border-white/15 px-4 py-2 text-sm text-neutral-200 hover:bg-white/10"
    >
      Log out
    </button>
  );
}
