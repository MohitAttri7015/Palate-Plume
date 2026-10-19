// TEMPORARY page so you can test the login. Replace it with your real dashboard later.
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LOGIN_PATH, STAFF_HOME } from "@/lib/config";
import LogoutButton from "../../components/auth/LogoutButton";

// Reading the login cookie must happen inside <Suspense> (needed by newer Next.js versions).
export default function AdminPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-950" />}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  // Check again here too, not only in proxy.js (two locks are safer than one).
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (session.role !== "admin") redirect(STAFF_HOME);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-amber-500">ADMIN</p>
            <h1 className="mt-1 text-2xl font-semibold">Welcome, {session.username}</h1>
            <p className="mt-1 text-sm text-neutral-400">You are logged in as the cafe admin.</p>
          </div>

        </div>
        <div className="mt-8 rounded-xl border border-white/10 bg-neutral-900 p-5 text-sm text-neutral-300">
          Login works. The dashboard, menu manager and settings will be built here next.
        </div>
        <Link href="/admin/orders" className="mt-4 inline-block text-sm text-amber-500 hover:underline">
          Open the kitchen screen
        </Link>
      </div>
    </main>
  );
}
