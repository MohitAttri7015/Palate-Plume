import PauseWhenHidden from "@/components/PauseWhenHidden"
import Ferrofluid from "@/components/auth/Ferrofluid";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LOGIN_PATH, STAFF_HOME } from "@/lib/config";
import AddPanel from "@/components/admin/AddPanel";

export default function NewItemPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-[#0A0A0C]" />}>
            <NewItem />
        </Suspense>
    );
}

async function NewItem() {
    const session = await getSession();
    if (!session) redirect(LOGIN_PATH);
    if (session.role !== "admin") redirect(STAFF_HOME);

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
                        mouseInteraction
                        mouseStrength={1}
                        mouseRadius={0.35}
                    />
                </PauseWhenHidden>
            </div>
            <div className="mx-auto flex max-w-xl flex-col gap-8 relative z-20">
                <div>
                    <Link href="/admin" className="text-sm text-white/60 hover:text-white">
                        Back to home
                    </Link>
                    <h1 className="sr-only">Add menu items and categories</h1>
                </div>

                <AddPanel />
            </div>
        </main>
    );
}