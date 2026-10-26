import Link from "next/link";

export const metadata = {
    title: { absolute: "Page not found | Palate & Plume" },
    robots: { index: false },
};

// Shown for any address that does not exist.
export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center text-white">
            <h1 className="font-heading text-4xl sm:text-5xl">Page not found</h1>
            <p className="max-w-sm font-ui text-sm leading-relaxed text-white/70">
                We could not find the page you were looking for.
            </p>
            <Link href="/" className="border border-white px-10 py-3 font-ui text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                Back to home
            </Link>
        </main>
    );
}