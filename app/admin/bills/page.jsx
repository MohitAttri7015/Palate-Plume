// Table bills. Admin and staff both open this page.
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/config";
import BillsBoard from "@/components/admin/BillsBoard";

export const metadata = { title: "Table bills | Palate & Plume", robots: { index: false } };

export default function BillsPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-neutral-950" />}>
            <Bills />
        </Suspense>
    );
}

async function Bills() {
    const session = await getSession();
    if (!session) redirect(LOGIN_PATH);

    return (
        <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100 sm:px-6 font-ui">
            <div className="mx-auto max-w-6xl">
                <div className="flex items-start justify-between gap-4 sm:flex-row flex-col">
                    <div>
                        <p className="text-xs font-medium tracking-[0.2em] text-amber-500">BILLING</p>
                        <h1 className="mt-1 text-2xl font-semibold">Table bills</h1>
                        <p className="mt-1 text-sm text-neutral-400">Logged in as {session.username} ({session.role}).</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-300">
                        <Link href="/admin/orders" className="text-amber-500 border-1 px-4 py-2 rounded-full">
                            Kitchen
                        </Link>
                        <Link href="/" className="border-1 px-4 py-2 rounded-full transition all 0.3s hover:bg-white hover:text-black">
                            Back to Home
                        </Link>
                    </div>
                </div>

                <BillsBoard />
            </div>
        </main>
    );
}