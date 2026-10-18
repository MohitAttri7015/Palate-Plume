"use client";
import { useState } from "react";
import { Field, inputClass } from "@/components/admin/FormParts";
import ImageField from "@/components/admin/ImageField";

export default function ItemForm({ categories = [] }) {
    const [categoryId, setCategoryId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [mainImage, setMainImage] = useState(null);
    const [secondImage, setSecondImage] = useState(null);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");

    // Checks the form. Gives back something like { name: "message", price: "message" }.
    // An empty result means everything is fine.
    function validate() {
        const found = {};
        if (!categoryId) found.categoryId = "Please choose a category.";
        if (name.trim().length < 2) found.name = "Please enter the item name (at least 2 letters).";
        if (!description.trim()) found.description = "Please write a short description.";
        if (!/^\d{1,6}(\.\d{1,2})?$/.test(price.trim()) || Number(price) <= 0) {
            found.price = "Enter a price like 149 or 149.50.";
        }
        if (!mainImage) found.mainImage = "Please add a main picture.";
        if (!secondImage) found.secondImage = "Please add a second picture.";
        return found;
    }

    // When someone starts fixing a field, remove its red message.
    const clearError = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

    function handleSubmit(e) {
        e.preventDefault(); // stops the page from reloading
        setMessage("");

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) return; // stop here, the red messages explain why

        console.log("Form data:", {
            categoryId,
            name: name.trim(),
            description: description.trim(),
            price: price.trim(),
            mainImage: { name: mainImage.name, size: mainImage.size },
            secondImage:{ name: secondImage.name, size: secondImage.size }
        });
        setMessage("The form works! It is not saved yet. Saving comes in a later step.");
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-xl flex-col gap-6 font-ui text-white">
            <Field
                id="category"
                label="Category"
                error={errors.categoryId}
                hint={categories.length === 0 ? 'No categories yet. Click "Add new category" above to create one.' : "Where this item appears on the menu."}
            >
                <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => {
                        setCategoryId(e.target.value);
                        clearError("categoryId");
                    }}
                    aria-invalid={errors.categoryId ? true : undefined}
                    aria-describedby={errors.categoryId ? "category-error" : undefined}
                    className={inputClass + " bg-[#0A0A0C]"}
                >
                    <option value="" className="bg-[#0A0A0C]">Choose a category...</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0A0A0C]">{c.name}</option>
                    ))}
                </select>
            </Field>

            <Field id="name" label="Item name" error={errors.name}>
                <input
                    id="name"
                    type="text"
                    maxLength={80}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        clearError("name");
                    }}
                    placeholder="e.g. Cappuccino"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className={inputClass}
                />
            </Field>

            <Field id="description" label="Description" error={errors.description} hint={`${description.length}/300`}>
                <textarea
                    id="description"
                    rows={3}
                    maxLength={300}
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        clearError("description");
                    }}
                    placeholder="A short line customers will read, e.g. Double espresso with steamed milk foam."
                    aria-invalid={errors.description ? true : undefined}
                    aria-describedby={errors.description ? "description-error" : undefined}
                    className={inputClass + " resize-none"}
                />
            </Field>

            <Field id="price" label="Price" error={errors.price} hint="In rupees. For example 149 or 149.50">
                <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/50">₹</span>
                    <input
                        id="price"
                        type="text"
                        inputMode="decimal"
                        maxLength={9}
                        value={price}
                        onChange={(e) => {
                            setPrice(e.target.value.replace(/[^\d.]/g, ""));
                            clearError("price");
                        }}
                        aria-invalid={errors.price ? true : undefined}
                        aria-describedby={errors.price ? "price-error" : undefined}
                        className={inputClass + " pl-9"}
                    />
                </div>
            </Field>

            <ImageField
                id="mainImage"
                label="Main picture"
                hint="The big photo customers see first."
                file={mainImage}
                onChange={(f) => {
                    setMainImage(f);
                    clearError("mainImage");
                }}
                error={errors.mainImage}
            />

            <ImageField
                id="secondImage"
                label="Second picture"
                hint="A second angle or a closer look."
                file={secondImage}
                onChange={(f) => {
                    setSecondImage(f);
                    clearError("secondImage");
                }}
                error={errors.secondImage}
            />

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