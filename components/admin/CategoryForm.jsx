"use client";
import { useState } from "react";
import { Field, inputClass } from "@/components/admin/FormParts";

export default function CategoryForm() {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");

    function handleSubmit(e) {
        e.preventDefault(); // stops the page from reloading
        console.log("Category data:", { name: name.trim() });
        setMessage("The form works! It is not saved yet. Saving comes in a later step.");
    }

    return (
        <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-6 font-ui text-white">
            <Field id="categoryName" label="Category name" hint="For example Coffee, Snacks or Desserts">
                <input
                    id="categoryName"
                    type="text"
                    maxLength={40}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Coffee"
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
                className="flex w-full cursor-pointer items-center justify-center rounded-full border border-white py-3 text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black"
            >
                Save category
            </button>
        </form>
    );
}