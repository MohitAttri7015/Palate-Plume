// The kitchen board. Admin and staff both open this page; the list updates itself every 3 seconds.
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/config";
import KitchenBoard from "@/components/admin/KitchenBoard";

export const metadata = { title: "Kitchen | Palate & Plume", robots: { index: false } };

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
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100 sm:px-6 font-ui">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-amber-500">KITCHEN</p>
            <h1 className="mt-1 text-2xl font-semibold">Live orders</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Logged in as {session.username} ({session.role}).
            </p>
          </div>
          <div className="flex md:flex-row flex-col items-center gap-4 text-sm text-neutral-300">
            {session.role === "admin" && (
              <Link href="/admin/tables" className="text-amber-500 hover:underline">
                Manage Tables
              </Link>
            )}
            <Link href="/" className=" hover:underline">
              Back to Home
            </Link>
          </div>
        </div>

        <KitchenBoard />
      </div>
    </main>
  );
}