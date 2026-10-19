"use client";
import { useRef, useState, useEffect } from "react";
import { Field, inputClass } from "@/components/admin/FormParts";
import ImageField from "@/components/admin/ImageField";
import { uploadImage } from "@/lib/uploadImage";

export default function ItemForm({ types = [], categories = [] }) {
    const [typeId, setTypeId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [mainImage, setMainImage] = useState(null);
    const [secondImage, setSecondImage] = useState(null);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false); // true while uploading or saving
    const [status, setStatus] = useState(""); // what we are doing right now, e.g. "Uploading the main picture..."


    // Hide the green success message after 4 seconds
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(() => setMessage(""), 2000);
        return () => clearTimeout(timer); // cancel the timer if the message changes or the page closes
    }, [message]);

    // Only the categories that belong to the chosen type (Food or Drink).
    const categoriesOfType = categories.filter((c) => c.typeId === typeId);

    // Remembers pictures that were already uploaded, so if saving fails and you
    // press Save again, the same picture is not uploaded twice.
    const uploaded = useRef(new WeakMap());
    async function uploadOnce(file) {
        if (uploaded.current.has(file)) return uploaded.current.get(file);
        const result = await uploadImage(file);
        uploaded.current.set(file, result);
        return result;
    }

    // Checks the form. Gives back something like { name: "message", price: "message" }.
    // An empty result means everything is fine.
    function validate() {
        const found = {};
        if (!typeId) found.typeId = "Please choose a type (Food or Drink).";
        if (typeId && !categoryId) found.categoryId = "Please choose a category.";
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

    async function handleSubmit(e) {
        e.preventDefault(); // stops the page from reloading
        if (busy) return; // ignore a second click
        setMessage("");
        setFormError("");

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) return; // stop here, the red messages explain why

        setBusy(true);
        try {
            // Upload both pictures at the same time
            setStatus("Uploading pictures...");
            const [main, second] = await Promise.all([
                uploadOnce(mainImage),
                secondImage ? uploadOnce(secondImage) : Promise.resolve(null),
            ]);

            // Save the item. The server checks everything again.
            setStatus("Saving the item...");
            const res = await fetch("/api/admin/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId,
                    name: name.trim(),
                    description: description.trim(),
                    price: price.trim(),
                    mainImage: { url: main.url, fileId: main.fileId },
                    secondImage: second ? { url: second.url, fileId: second.fileId } : null,
                }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setErrors(data.fieldErrors || {});
                setFormError(data.error || "Could not save the item. Please try again.");
                // If the server did not accept a picture, forget it so the next try uploads it again.
                if (data.fieldErrors?.mainImage) uploaded.current.delete(mainImage);
                if (data.fieldErrors?.secondImage && secondImage) uploaded.current.delete(secondImage);
                return;
            }

            // Saved! Clear the form for the next item (the category stays selected).
            setMessage(`"${data.item.name}" was saved to your menu.`);
            setName("");
            setDescription("");
            setPrice("");
            setMainImage(null);
            setSecondImage(null);
            setErrors({});

        } catch (err) {
            setFormError(err.message || "Something went wrong. Please try again.");
        } finally {
            setBusy(false);
            setStatus("");
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex w-full max-w-xl flex-col gap-6 font-ui text-white">
            {/* While busy, everything inside this fieldset is locked. */}
            <fieldset disabled={busy} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
                <Field
                    id="type"
                    label="Type"
                    error={errors.typeId}
                    hint={types.length === 0 ? 'No types found. Add "Food" and "Drink" to the type collection in Atlas.' : "Is this item food or a drink?"}
                >
                    <select
                        id="type"
                        value={typeId}
                        onChange={(e) => {
                            setTypeId(e.target.value);
                            setCategoryId(""); 
                            clearError("typeId");
                            clearError("categoryId");
                        }}
                        aria-invalid={errors.typeId ? true : undefined}
                        aria-describedby={errors.typeId ? "type-error" : undefined}
                        className={inputClass + " bg-[#0A0A0C]"}
                    >
                        <option value="" className="bg-[#0A0A0C]">Choose a type...</option>
                        {types.map((t) => (
                            <option key={t.id} value={t.id} className="bg-[#0A0A0C]">{t.name}</option>
                        ))}
                    </select>
                </Field>

                <Field
                    id="category"
                    label="Category"
                    error={errors.categoryId}
                    hint={
                        !typeId
                            ? "Choose a type first."
                            : categoriesOfType.length === 0
                                ? 'No categories for this type yet. Click "Add new category" above to create one.'
                                : "Where this item appears on the menu."
                    }
                >
                    <select
                        id="category"
                        disabled={!typeId}
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
                        {categoriesOfType.map((c) => (
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
            </fieldset>

            <div aria-live="polite" className="flex flex-col gap-3">
                {formError && (
                    <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {formError}
                    </p>
                )}
                {message && (
                    <p role="status" className="rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                        {message}
                    </p>
                )}
            </div>

            <button
                type="submit"
                disabled={busy}
                className="flex w-full cursor-pointer items-center justify-center rounded-full border border-white py-3 text-sm font-medium transition-all duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
            >
                {busy ? status || "Working..." : "Save item"}
            </button>
        </form>
    );
}