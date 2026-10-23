import Link from "next/link";

export const metadata = {
    title: { absolute: "Need help? | Palate & Plume" },
    alternates: { canonical: "/table-help" },
    robots: { index: false },
};

// Shown when a table QR code is not valid any more (old sticker, switched off, mistyped address).
export default function TableHelp() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center text-white">
            <h1 className="font-heading text-4xl sm:text-5xl">We could not find your table</h1>
            <p className="max-w-sm font-ui text-sm leading-relaxed text-white/70">
                This QR code is not active. Please ask a member of our team to help you, or scan the code on your table again.
            </p>
            <Link href="/menu" className="border border-white px-10 py-3 font-ui text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                Browse the menu
            </Link>
        </main>
    );
}