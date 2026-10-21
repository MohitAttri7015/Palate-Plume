// Shown while the menu loads, so the page is never blank. It mimics the real layout:
// tilted picture cards, the big number, the text lines and the dropdown buttons.
export default function MenuSkeleton() {
    const card = 'absolute left-1/2 top-1/2 animate-pulse bg-white/5'
    return (
        <div className="relative isolate h-screen w-screen overflow-hidden" role="status" aria-busy="true" aria-label="Loading the menu">
            {/* Close + dropdown buttons (top right) */}
            <div className="absolute right-5 top-5 z-20 flex flex-col items-end gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full border border-[#26262E]" />
                <div className="h-10 w-28 animate-pulse rounded-full border border-[#26262E]" />
                <div className="h-10 w-28 animate-pulse rounded-full border border-[#26262E]" />
            </div>

            {/* Picture cards on the same diagonal as the real ones */}
            <div className={`${card} h-[190px] w-[250px] -translate-x-1/2 -translate-y-1/2 rotate-[8deg] md:h-[260px] md:w-[340px]`} />
            <div className={`${card} h-[150px] w-[200px] -translate-y-[170%] translate-x-[10%] rotate-[8deg] opacity-60 md:h-[200px] md:w-[270px]`} />
            <div className={`${card} h-[150px] w-[200px] -translate-x-[110%] translate-y-[90%] rotate-[8deg] opacity-60 md:h-[200px] md:w-[270px]`} />

            {/* Big number */}
            <div className="absolute bottom-8 left-4 h-28 w-40 animate-pulse bg-white/5 sm:left-12 md:h-56 md:w-72" />

            {/* Category, name, description, button */}
            <div className="absolute inset-x-0 bottom-24 flex flex-col items-center gap-4 px-4 md:inset-x-auto md:bottom-auto md:right-[8%] md:top-1/2 md:w-[26vw] md:-translate-y-1/2">
                <div className="h-2.5 w-24 animate-pulse bg-white/10" />
                <div className="h-8 w-56 animate-pulse bg-white/10" />
                <div className="h-px w-10 bg-white/20" />
                <div className="h-2.5 w-64 max-w-full animate-pulse bg-white/10" />
                <div className="h-2.5 w-52 max-w-full animate-pulse bg-white/10" />
                <div className="mt-2 h-12 w-full max-w-sm animate-pulse rounded-xl border border-[#26262E]" />
            </div>
        </div>
    )
}