// Shown while a home section is loading its menu items.
export default function SliderSkeleton({ label }) {
    return (
        <div className="text-white mt-[5rem] sm:px-12 px-4 py-8 flex flex-col gap-15">
            <div className="flex gap-4 flex-row items-center">
                <span className="w-2 h-2 bg-white"></span>
                <p className="font-ui text-[12px] tracking-[5px] uppercase">{label}</p>
            </div>
            <div className="-mx-4 flex gap-1 overflow-hidden px-4 sm:-mx-12 sm:px-12">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-[25rem] w-[70vw] shrink-0 animate-pulse bg-white/5 sm:w-[44vw] md:w-[32vw] lg:h-[34rem] lg:w-[25vw] xl:w-[22vw]" />
                ))}
            </div>
        </div>
    );
}