import Link from "next/link";

export const metadata = {
    title: { absolute: "This table is full | Palate & Plume" },
    alternates: { canonical: "/table-full" },
    robots: { index: false },
};

// Shown when a 5th phone scans a table that already has 4 people.
export default function TableFull() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center text-white">
            <h1 className="font-heading text-4xl sm:text-5xl">This table is full</h1>
            <p className="max-w-sm font-ui text-sm leading-relaxed text-white/70">
                Four people are already ordering from this table. Please ask a member of our team to help you, or look at
                the menu while you wait.
            </p>
            <Link href="/menu" className="border border-white px-10 py-3 font-ui text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                Browse the menu
            </Link>
        </main>
    );
}