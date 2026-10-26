// The menu manager. ADMIN ONLY: staff are sent back to the kitchen.
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LOGIN_PATH, STAFF_HOME } from "@/lib/config";
import { adminItem } from "@/lib/menuAdmin";
import Type from "@/models/Type";
import Category from "@/models/Category";
import MenuItem from "@/models/MenuItem";
import MenuManager from "@/components/admin/MenuManager";

export const metadata = { title: "Menu manager | Palate & Plume", robots: { index: false } };

export default function MenuManagerPage() {
    return (
        <Suspense fallback={<main className="min-h-screen" />}>
            <ManagerContent />
        </Suspense>
    );
}

async function ManagerContent() {
    // Check again here too, not only in proxy.js (two locks are safer than one).
    const session = await getSession();
    if (!session) redirect(LOGIN_PATH);
    if (session.role !== "admin") redirect(STAFF_HOME);

    let types = [];
    let categories = [];
    let items = [];
    let loadError = false;
    try {
        await connectDB();
        const [typeRows, categoryRows, itemRows] = await Promise.all([
            Type.find().sort({ _id: 1 }).lean(),
            Category.find({ cafeId: session.cafeId }).sort({ sortOrder: 1, name: 1 }).lean(),
            MenuItem.find({ cafeId: session.cafeId }).sort({ sortOrder: 1 }).lean(),
        ]);
        types = typeRows.map((t) => ({ id: String(t._id), name: t.name }));
        categories = categoryRows.map((c) => ({ id: String(c._id), name: c.name, typeId: c.typeId ? String(c.typeId) : "" }));
        items = itemRows.map(adminItem);
    } catch (err) {
        console.error("Load menu manager error:", err);
        loadError = true;
    }

    return (
        <main className="min-h-screen px-4 py-10 font-ui text-neutral-100 sm:px-6 ">
            <div className="mx-auto max-w-3xl">
                <div className="flex items-center justify-between gap-4 text-sm">
                    <Link href="/admin/orders" className="text-neutral-400 hover:text-white">Back to kitchen</Link>
                    <Link href="/admin/menu/new" className="text-amber-500 hover:underline">Add new item</Link>
                </div>
                <p className="mt-6 text-xs font-medium tracking-[0.2em] text-amber-500">MENU</p>
                <h1 className="mt-1 text-2xl font-semibold font-heading">Menu manager</h1>
                <p className="mt-1 text-sm text-neutral-400">
                    Edit any item, or switch it to <span className="text-white">Sold out</span>. Sold-out items stay on the menu but cannot be ordered.
                </p>

                {loadError ? (
                    <p className="mt-8 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">Could not load the menu. Please refresh the page.</p>
                ) : (
                    <MenuManager types={types} categories={categories} initialItems={items} />
                )}
            </div>
        </main>
    );
}