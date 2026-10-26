'use client';

import Link from "next/link";

// Shown when something unexpected breaks while a page is open (instead of a blank white screen).
export default function Error({ reset }) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center text-white">
            <h1 className="font-heading text-4xl sm:text-5xl">Something went wrong</h1>
            <p className="max-w-sm font-ui text-sm leading-relaxed text-white/70">
                Sorry about that. Please try again. If it keeps happening, ask a member of our team.
            </p>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => reset()}
                    className="cursor-pointer border border-white bg-white px-8 py-3 font-ui text-[12px] uppercase tracking-[1px] text-black transition-colors duration-500 hover:bg-black hover:text-white"
                >
                    Try again
                </button>
                <Link href="/" className="border border-white px-8 py-3 font-ui text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                    Home
                </Link>
            </div>
        </main>
    );
}