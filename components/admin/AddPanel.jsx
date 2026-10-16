"use client";
import { useState } from "react";
import ItemForm from "@/components/admin/ItemForm";
import CategoryForm from "@/components/admin/CategoryForm";

const TABS = [
    { id: "item", label: "Add new item", text: "Fill in the details. Customers will see this on the menu." },
    { id: "category", label: "Add new category", text: "Categories group your menu, for example Coffee, Snacks or Desserts." },
];

export default function AddPanel() {
    const [tab, setTab] = useState("item");
    const active = TABS.find((t) => t.id === tab);

    return (
        <div className="flex w-full flex-col gap-8">
            {/* The two buttons */}
            <div className="flex flex-wrap gap-3">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        aria-pressed={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`cursor-pointer rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-300 ${tab === t.id
                                ? "border-white bg-white text-black"
                                : "border-white/30 text-white/70 hover:border-white hover:text-white"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <p className="text-sm text-white/60">{active.text}</p>

            {/* Both forms stay on the page; only one is shown. So what you typed is not lost when you switch. */}
            <div hidden={tab !== "item"}>
                <ItemForm />
            </div>
            <div hidden={tab !== "category"}>
                <CategoryForm />
            </div>
        </div>
    );
}