"use client";

import { useRouter } from "next/navigation";


export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <span
      onClick={handleLogout}
      className="cursor-pointer"
    >
      Log out
    </span>
  );
}
