"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import ItemEditForm from "@/components/admin/ItemEditForm";

// The admin's list of every menu item: a "Sold out" switch and an Edit button on each row.
export default function MenuManager({ types = [], categories = [], initialItems = [] }) {
    const [items, setItems] = useState(initialItems);
    const [query, setQuery] = useState("");
    const [editingId, setEditingId] = useState("");
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const soldOutCount = items.filter((i) => !i.isAvailable).length;

    // Type -> category -> items, only the ones that match the search.
    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        return types
            .map((type) => ({
                ...type,
                categories: categories
                    .filter((c) => c.typeId === type.id)
                    .map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id && (!q || i.name.toLowerCase().includes(q))) }))
                    .filter((c) => c.items.length > 0),
            }))
            .filter((g) => g.categories.length > 0);
    }, [types, categories, items, query]);

    // The "Sold out" switch. The row changes at once; if the server says no, it changes back.
    async function toggleSoldOut(item) {
        if (busyId) return;
        const nextAvailable = !item.isAvailable;
        setError("");
        setNotice("");
        setBusyId(item.id);
        setItems((list) => list.map((i) => (i.id === item.id ? { ...i, isAvailable: nextAvailable } : i)));
        try {
            const res = await fetch(`/api/admin/items/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isAvailable: nextAvailable }),
            });
            if (!res.ok) throw new Error("failed");
        } catch {
            setItems((list) => list.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)));
            setError(`Could not change "${item.name}". Please try again.`);
        } finally {
            setBusyId("");
        }
    }

    function handleSaved(saved) {
        setItems((list) => list.map((i) => (i.id === saved.id ? saved : i)));
        setEditingId("");
        setNotice(`"${saved.name}" was saved.`);
    }

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search items..."
                    aria-label="Search items"
                    className="w-full max-w-xs rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm outline-none focus:border-white/60"
                />
                <p className="text-xs text-neutral-400">
                    {items.length} items{soldOutCount > 0 && <> · <span className="text-red-300">{soldOutCount} sold out</span></>}
                </p>
            </div>

            <div aria-live="polite">
                {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                {notice && <p role="status" className="mt-4 rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">{notice}</p>}
            </div>

            {groups.length === 0 && (
                <p className="mt-10 text-sm text-neutral-400">{items.length === 0 ? "No items yet. Use \"Add new item\" to create the first one." : "No item matches your search."}</p>
            )}

            {groups.map((group) => (
                <section key={group.id} className="mt-10">
                    <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-amber-500">{group.name}</h2>
                    {group.categories.map((category) => (
                        <div key={category.id} className="mt-5">
                            <h3 className="font-heading text-xl">{category.name}</h3>
                            <ul className="mt-2 flex flex-col divide-y divide-white/10 rounded-xl border border-white/10">
                                {category.items.map((item) => (
                                    <li key={item.id} className="p-3 sm:p-4">
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#16161A]">
                                                {item.mainThumb && (
                                                    <Image src={item.mainThumb} alt="" fill sizes="56px" className={`object-cover ${item.isAvailable ? "" : "opacity-50 grayscale"}`} />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className={`truncate text-sm font-medium ${item.isAvailable ? "" : "text-white/50"}`}>{item.name}</p>
                                                <p className="mt-0.5 text-xs text-neutral-400">₹{item.price}</p>
                                            </div>

                                            {/* Sold out switch: on = customers see "Sold out" and cannot order it */}
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={!item.isAvailable}
                                                aria-label={`Sold out: ${item.name}`}
                                                disabled={busyId === item.id}
                                                onClick={() => toggleSoldOut(item)}
                                                className="flex shrink-0 cursor-pointer items-center gap-2 disabled:cursor-wait disabled:opacity-60"
                                            >
                                                <span className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${item.isAvailable ? "bg-white/20" : "bg-red-500"}`}>
                                                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-300 ${item.isAvailable ? "left-0.5" : "left-[22px]"}`} />
                                                </span>
                                                <span className={`hidden w-14 text-left text-xs sm:block ${item.isAvailable ? "text-neutral-400" : "text-red-300"}`}>
                                                    {item.isAvailable ? "Available" : "Sold out"}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNotice("");
                                                    setEditingId(editingId === item.id ? "" : item.id);
                                                }}
                                                aria-expanded={editingId === item.id}
                                                className="shrink-0 cursor-pointer rounded-full border border-white/30 px-4 py-1.5 text-xs transition-colors hover:border-white hover:bg-white hover:text-black"
                                            >
                                                {editingId === item.id ? "Close" : "Edit"}
                                            </button>
                                        </div>

                                        {editingId === item.id && (
                                            <div className="mt-4">
                                                <ItemEditForm
                                                    item={item}
                                                    types={types}
                                                    categories={categories}
                                                    onSaved={handleSaved}
                                                    onCancel={() => setEditingId("")}
                                                />
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );
}