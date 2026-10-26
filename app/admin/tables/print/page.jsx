// One printable sheet with a QR code for every active table. Admin only.
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LOGIN_PATH, STAFF_HOME } from "@/lib/config";
import { scanUrl, tableCode, SITE_URL } from "@/lib/tables";
import Table from "@/models/Table";
import PrintButton from "@/components/admin/PrintButton";

export default function PrintPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-white" />}>
            <PrintContent />
        </Suspense>
    );
}

async function PrintContent() {
    const session = await getSession();
    if (!session) redirect(LOGIN_PATH);
    if (session.role !== "admin") redirect(STAFF_HOME);

    let cards = [];
    try {
        await connectDB();
        const tables = await Table.find({ cafeId: session.cafeId, isActive: true }).sort({ number: 1 }).select("number token").lean();
        // The QR is drawn here on the server as a small SVG picture (sharp at any print size, no extra JavaScript for the browser).
        cards = await Promise.all(
            tables.map(async (t) => ({
                id: String(t._id),
                number: t.number,
                code: tableCode(t.token), // for guests who cannot scan: they type the table number and this code
                svg: await QRCode.toString(scanUrl(t.token), { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } }),
            }))
        );
    } catch (err) {
        console.error("Load QR codes error:", err);
    }

    return (
        <main className="min-h-screen p-6 text-white print:bg-white print:p-0 print:text-black">
            <div className="mb-6 flex items-center justify-between print:hidden">
                <Link href="/admin/tables" className="text-sm underline font-ui">Back to tables</Link>
                <PrintButton />
            </div>

            {cards.length === 0 ? (
                <p className="text-sm font-ui">No active tables. Create them first on the tables page.</p>
            ) : (
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 print:grid-cols-3 print:gap-4">
                    {cards.map((c) => (
                        <div key={c.id} className="break-inside-avoid border border-white/20 p-4 text-center font-ui print:border-black/40">
                            <p className="text-lg font-semibold font-heading">Palate &amp; Plume</p>
                            {/* The SVG comes from the QR library, built only from our own link, never from visitor input. */}
                            <div className="mx-auto my-3 w-full max-w-[220px] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
                            <p className="text-3xl font-semibold">Table {c.number}</p>
                            <p className="mt-1 text-xs">Scan to see the menu and order</p>
                            <p className="mt-3 text-[10px] text-white/60 print:text-black/70">Cannot scan? Open {SITE_URL.replace(/^https?:\/\//, "")}, choose &quot;Enter Table #&quot; and type the table number and this code:</p>
                            <p className="mt-1 text-xl font-semibold tracking-[0.3em]">{c.code}</p>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}