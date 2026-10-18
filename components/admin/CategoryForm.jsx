"use client";
import { useEffect, useRef, useState } from "react";
import { Field, inputClass } from "@/components/admin/FormParts";

// onCreated(category) is called after a category is saved, so the item form can show it.
export default function CategoryForm({ onCreated }) {
    const nameRef = useRef(null);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    // After a save or an error, put the cursor back in the box.
    // (It has to wait until the form is enabled again, so it runs after the re-render.)
    useEffect(() => {
        if ((message || error) && !loading) nameRef.current?.focus();
    }, [message, error, loading]);

    async function handleSubmit(e) {
        e.preventDefault(); // stops the page from reloading
        if (loading) return; // ignore a second click while the first is still saving

        const trimmed = name.trim();
        if (!trimmed) {
            setMessage("");
            setError("Please enter a category name.");
            return;
        }

        setError("");
        setMessage("");
        setLoading(true);

        try {
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.error || "Could not save the category. Please try again.");
                setLoading(false);
                return;
            }

            onCreated?.(data.category); // tell the item form about the new category
            setName("");
            setMessage(`Category "${data.category.name}" created. You can now choose it when adding an item.`);
            setLoading(false);
        } catch {
            setError("Can't reach the server. Check your internet connection and try again.");
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-xl flex-col gap-6 font-ui text-white">
            <Field id="categoryName" label="Category name" error={error} hint="For example Coffee, Snacks or Desserts">
                <input
                    ref={nameRef}
                    id="categoryName"
                    type="text"
                    maxLength={40}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError("");
                    }}
                    disabled={loading}
                    placeholder="e.g. Coffee"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "categoryName-error" : undefined}
                    className={inputClass}
                />
            </Field>

            {message && (
                <p role="status" className="rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                    {message}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center rounded-full border border-white py-3 text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
            >
                {loading ? "Saving..." : "Save category"}
            </button>
        </form>
    );
}