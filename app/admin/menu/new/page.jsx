import PauseWhenHidden from "@/components/PauseWhenHidden"
import Ferrofluid from "@/components/auth/Ferrofluid";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LOGIN_PATH, STAFF_HOME } from "@/lib/config";
import Category from "@/models/Category";
import Type from "@/models/Type";
import AddPanel from "@/components/admin/AddPanel";
import Loading from "./loading";


export default function NewItemPage() {
    return (
        <Suspense fallback={<Loading />}>
            <NewItem />
        </Suspense>
    );
}

async function NewItem() {
    const session = await getSession();
    if (!session) redirect(LOGIN_PATH);
    if (session.role !== "admin") redirect(STAFF_HOME);

    // Load THIS cafe's categories (cafeId comes from the login) for the dropdown.
    let categories = [];
    let types = [];
    let loadError = false;
    try {
        await connectDB();
        const [typeRows, rows] = await Promise.all([
            Type.find().sort({ _id: 1 }).lean(), // Food, Drink (in the order you added them in Atlas)
            Category.find({ cafeId: session.cafeId }).sort({ sortOrder: 1, name: 1 }).lean(),
        ]);
        types = typeRows.map((t) => ({ id: String(t._id), name: t.name }));
        // plain text ids can be passed to the form
        categories = rows.map((c) => ({ id: String(c._id), name: c.name, typeId: c.typeId ? String(c.typeId) : "" }));
    } catch (err) {
        console.error("Load categories error:", err);
        loadError = true;
    }

    return (
        <main className="min-h-screen bg-[#0A0A0C] px-4 py-10 font-ui text-white relative">
            <div className="absolute inset-0 z-0">
                <PauseWhenHidden>
                    <Ferrofluid
                        colors={["#ffffff", "#ffffff", "#ffffff"]}
                        speed={0.5}
                        scale={1.6}
                        turbulence={1}
                        fluidity={0.1}
                        rimWidth={0.2}
                        sharpness={2.5}
                        shimmer={1.5}
                        glow={2}
                        flowDirection="down"
                        opacity={1}
                        dpr={1}
                        mouseInteraction
                        mouseStrength={1}
                        mouseRadius={0.35}
                    />
                </PauseWhenHidden>
            </div>
            <div className="mx-auto flex max-w-xl flex-col gap-8 relative z-20">
                <div>
                    <Link href="/" className="text-sm text-white/60 hover:text-white">
                        Back to home
                    </Link>
                    <h1 className="sr-only">Add menu items and categories</h1>
                </div>

                <AddPanel initialTypes={types} initialCategories={categories} />
            </div>
        </main>
    );
}