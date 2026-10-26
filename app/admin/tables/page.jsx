import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LOGIN_PATH, STAFF_HOME } from "@/lib/config";
import Table from "@/models/Table";
import TablesManager from "@/components/admin/TablesManager";

export default function TablesPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-neutral-950" />}>
            <TablesContent />
        </Suspense>
    );
}

async function TablesContent() {
    // Check again here too, not only in proxy.js (two locks are safer than one).
    const session = await getSession();
    if (!session) redirect(LOGIN_PATH);
    if (session.role !== "admin") redirect(STAFF_HOME);

    let tables = [];
    let loadError = false;
    try {
        await connectDB();
        const rows = await Table.find({ cafeId: session.cafeId }).sort({ number: 1 }).select("number isActive").lean();
        // The secret codes are NOT sent to this page, only to the print page.
        tables = rows.map((t) => ({ id: String(t._id), number: t.number, isActive: t.isActive }));
    } catch (err) {
        console.error("Load tables error:", err);
        loadError = true;
    }

    return (
        <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
            <div className="mx-auto max-w-2xl">
                <Link href="/admin/orders" className="text-sm text-neutral-400 hover:text-white">Back to kitchen</Link>
                <p className="mt-6 text-xs font-medium tracking-[0.2em] text-amber-500">TABLES</p>
                <h1 className="mt-1 text-2xl font-semibold">Tables and QR codes</h1>
                <p className="mt-1 text-sm text-neutral-400">Every table has its own QR code. Print them and stick one on each table.</p>

                {loadError ? (
                    <p className="mt-8 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">Could not load the tables. Please refresh the page.</p>
                ) : (
                    <TablesManager tables={tables} />
                )}
            </div>
        </main>
    );
}