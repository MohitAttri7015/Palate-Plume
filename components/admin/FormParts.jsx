// Small pieces shared by all the admin forms, so we don't repeat them.

export const inputClass =
    "w-full rounded-lg border border-[#333] bg-transparent px-4 py-3 text-sm text-[#ccc] outline-none transition-colors focus:border-white/50";

// One labelled box: the label on top, the input below, and a small hint line.
export function Field({ id, label, hint, children }) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm text-white">{label}</label>
            {children}
            {hint && <p className="text-xs text-white/40">{hint}</p>}
        </div>
    );
}