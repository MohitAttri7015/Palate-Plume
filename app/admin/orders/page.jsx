// TEMPORARY kitchen page so you can test the staff login. Replace it later with the live order board.
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/config";
import LogoutButton from "../LogoutButton";

export default function OrdersPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-950" />}>
      <KitchenOrders />
    </Suspense>
  );
}

async function KitchenOrders() {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-amber-500">KITCHEN</p>
            <h1 className="mt-1 text-2xl font-semibold">Live orders</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Logged in as {session.username} ({session.role}).
            </p>
          </div>
          <LogoutButton />
        </div>
        <div className="mt-8 rounded-xl border border-white/10 bg-neutral-900 p-5 text-sm text-neutral-300">
          No orders yet. New orders with their table numbers will appear here live.
        </div>
        {session.role === "admin" && (
          <Link href="/admin" className="mt-4 inline-block text-sm text-amber-500 hover:underline">
            Back to admin
          </Link>
        )}
      </div>
    </main>
  );
}
