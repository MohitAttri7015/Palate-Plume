"use client";

export default function PrintButton() {
    return (
        <button type="button" onClick={() => window.print()} className="cursor-pointer rounded-full border border-black px-5 py-2 text-sm hover:bg-black hover:text-white">
            Print
        </button>
    );
}