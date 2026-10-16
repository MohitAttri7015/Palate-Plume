"use client";
import { useState } from "react";

const inputClass =
    "w-full rounded-lg border border-[#333] bg-transparent px-4 py-3 text-sm text-[#ccc] outline-none transition-colors focus:border-white/50";

// One labelled box: the label on top, the input below, and a small hint line.
function Field({ id, label, hint, children }) {
    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm text-white">{label}</label>
            {children}
            {hint && <p className="text-xs text-white/40">{hint}</p>}
        </div>
    );
}

export default function ItemForm() {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [message, setMessage] = useState("");

    function handleSubmit(e) {
        e.preventDefault(); // stops the page from reloading
        console.log("Form data:", { name: name.trim(), price: price.trim(), description: description.trim() });
        setMessage("The form works! It is not saved yet. Saving comes in a later step.");
    }

    return (
        <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-6 font-ui text-white">
            <Field id="name" label="Item name">
                <input
                    id="name"
                    type="text"
                    maxLength={80}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cappuccino"
                    className={inputClass}
                />
            </Field>

            <Field id="price" label="Price" hint="In rupees. For example 149 or 149.50">
                <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/50">₹</span>
                    <input
                        id="price"
                        type="text"
                        inputMode="decimal"
                        maxLength={9}
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
                        className={inputClass + " pl-9"}
                    />
                </div>
            </Field>

            <Field id="description" label="Description (optional)" hint={`${description.length}/300`}>
                <textarea
                    id="description"
                    rows={3}
                    maxLength={300}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A short line customers will read, e.g. Double espresso with steamed milk foam."
                    className={inputClass + " resize-none"}
                />
            </Field>

            {message && (
                <p role="status" className="rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                    {message}
                </p>
            )}

            <button
                type="submit"
                className="flex w-full cursor-pointer items-center justify-center rounded-full border border-white py-3 text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black"
            >
                Save item
            </button>
        </form>
    );
}