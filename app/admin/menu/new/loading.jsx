export default function Loading() {
    return (
        <main className="min-h-screen bg-[#0A0A0C] px-4 py-10 font-ui text-white">
            <div className="mx-auto flex max-w-xl flex-col gap-8">
                <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
                <div className="flex gap-3">
                    <div className="h-10 w-36 animate-pulse rounded-full bg-white/10" />
                    <div className="h-10 w-44 animate-pulse rounded-full bg-white/10" />
                </div>
                <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
            </div>
        </main>
    );
}
