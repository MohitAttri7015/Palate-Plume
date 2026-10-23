"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TablesManager({ tables = [] }) {
    const router = useRouter();
    const [count, setCount] = useState(12);
    const [busy, setBusy] = useState(""); // which button is working right now
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function call(method, body, key) {
        if (busy) return null;
        setBusy(key);
        setError("");
        setMessage("");
        try {
            const res = await fetch("/api/admin/tables", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || "Something went wrong. Please try again.");
                return null;
            }
            router.refresh(); // reload the list from the server
            return data;
        } catch {
            setError("Can't reach the server. Check your internet connection and try again.");
            return null;
        } finally {
            setBusy("");
        }
    }

    async function createTables() {
        const data = await call("POST", { count: Number(count) }, "create");
        if (data) setMessage(data.created > 0 ? `${data.created} table${data.created === 1 ? "" : "s"} created.` : "Those tables already exist.");
    }

    async function change(table, action) {
        if (action === "regenerate" && !window.confirm(`Table ${table.number}: the QR code already printed will stop working and you will have to print a new one. Continue?`)) return;
        const data = await call("PATCH", { id: table.id, action }, table.id + action);
        if (data && action === "regenerate") setMessage(`Table ${table.number} has a new QR code. Print it again.`);
    }

    const button = "cursor-pointer rounded-full border border-white/30 px-4 py-1.5 text-xs transition-colors hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="mt-8 flex flex-col gap-8">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-neutral-900 p-5">
                <label className="flex flex-col gap-2 text-sm">
                    How many tables?
                    <input
                        type="number"
                        min={1}
                        max={50}
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        disabled={!!busy}
                        className="w-28 rounded-lg border border-[#333] bg-transparent px-3 py-2 text-sm outline-none focus:border-white/50"
                    />
                </label>
                <button type="button" onClick={createTables} disabled={!!busy} className={button}>
                    {busy === "create" ? "Creating..." : `Create tables 1 to ${count || "?"}`}
                </button>
                {tables.length > 0 && (
                    <Link href="/admin/tables/print" className={`${button} ml-auto inline-block`}>
                        Print QR codes
                    </Link>
                )}
            </div>

            <div aria-live="polite" className="flex flex-col gap-3">
                {error && <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                {message && <p role="status" className="rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">{message}</p>}
            </div>

            {tables.length === 0 ? (
                <p className="text-sm text-neutral-400">No tables yet. Choose how many you have and press the button above.</p>
            ) : (
                <ul className="flex flex-col divide-y divide-white/10 rounded-xl border border-white/10 bg-neutral-900">
                    {tables.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                            <span className="text-base font-medium">Table {t.number}</span>
                            <span className={`text-xs ${t.isActive ? "text-green-300" : "text-red-300"}`}>{t.isActive ? "Active" : "Switched off"}</span>
                            <div className="ml-auto flex gap-2">
                                <button type="button" disabled={!!busy} onClick={() => change(t, "regenerate")} className={button}>New QR code</button>
                                <button type="button" disabled={!!busy} onClick={() => change(t, t.isActive ? "disable" : "enable")} className={button}>
                                    {t.isActive ? "Switch off" : "Switch on"}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}