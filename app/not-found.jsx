import Link from "next/link";

import Ferrofluid from "@/components/auth/Ferrofluid";
import PauseWhenHidden from "@/components/PauseWhenHidden"

export const metadata = {
    title: { absolute: "Page not found | Palate & Plume" },
    robots: { index: false },
};

// Shown for any address that does not exist.
export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center text-white bg-[#0A0A0C] relative">
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
            <h1 className="font-heading text-4xl sm:text-5xl">Page not found</h1>
            <p className="max-w-sm font-ui text-sm leading-relaxed text-white/70">
                We could not find the page you were looking for.
            </p>
            <Link href="/" className="border border-white px-10 py-3 font-ui text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black relative z-2">
                Back to home
            </Link>
        </main>
    );
}