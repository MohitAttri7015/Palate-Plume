"use client";
import { useRef, useState } from "react";
import { Field, inputClass } from "@/components/admin/FormParts";
import ImageField from "@/components/admin/ImageField";
import { uploadImage } from "@/lib/uploadImage";

// Edit one existing item. Pictures are only uploaded when a new one was chosen.
export default function ItemEditForm({ item, types = [], categories = [], onSaved, onCancel }) {
    const startCategory = categories.find((c) => c.id === item.categoryId);
    const [typeId, setTypeId] = useState(startCategory?.typeId ?? "");
    const [categoryId, setCategoryId] = useState(item.categoryId);
    const [name, setName] = useState(item.name);
    const [description, setDescription] = useState(item.description);
    const [price, setPrice] = useState(item.price);
    const [mainImage, setMainImage] = useState(null); // a NEW picture, or null = keep the current one
    const [secondImage, setSecondImage] = useState(null);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");

    const categoriesOfType = categories.filter((c) => c.typeId === typeId);
    const uploaded = useRef(new WeakMap());
    async function uploadOnce(file) {
        if (uploaded.current.has(file)) return uploaded.current.get(file);
        const result = await uploadImage(file);
        uploaded.current.set(file, result);
        return result;
    }

    const clearError = (key) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    const uid = `edit-${item.id}`; // makes every id on the page unique (many forms can exist in one list)

    function validate() {
        const found = {};
        if (!typeId) found.typeId = "Please choose a type (Food or Drink).";
        if (typeId && !categoryId) found.categoryId = "Please choose a category.";
        if (name.trim().length < 2) found.name = "Please enter the item name (at least 2 letters).";
        if (!description.trim()) found.description = "Please write a short description.";
        if (!/^\d{1,6}(\.\d{1,2})?$/.test(price.trim()) || Number(price) <= 0) found.price = "Enter a price like 149 or 149.50.";
        return found;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (busy) return;
        setFormError("");
        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setBusy(true);
        try {
            let main = null;
            let second = null;
            if (mainImage || secondImage) {
                setStatus("Uploading pictures...");
                [main, second] = await Promise.all([
                    mainImage ? uploadOnce(mainImage) : Promise.resolve(null),
                    secondImage ? uploadOnce(secondImage) : Promise.resolve(null),
                ]);
            }

            setStatus("Saving...");
            const res = await fetch(`/api/admin/items/${item.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId,
                    name: name.trim(),
                    description: description.trim(),
                    price: price.trim(),
                    ...(main ? { mainImage: { url: main.url, fileId: main.fileId } } : {}),
                    ...(second ? { secondImage: { url: second.url, fileId: second.fileId } } : {}),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setErrors(data.fieldErrors || {});
                setFormError(data.error || "Could not save the item. Please try again.");
                if (data.fieldErrors?.mainImage && mainImage) uploaded.current.delete(mainImage);
                if (data.fieldErrors?.secondImage && secondImage) uploaded.current.delete(secondImage);
                return;
            }
            onSaved(data.item);
        } catch (err) {
            setFormError(err.message || "Something went wrong. Please try again.");
        } finally {
            setBusy(false);
            setStatus("");
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 rounded-xl border border-white/15 bg-neutral-900/60 p-4 font-ui text-white sm:p-5">
            <fieldset disabled={busy} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field id={`${uid}-type`} label="Type" error={errors.typeId}>
                        <select
                            id={`${uid}-type`}
                            value={typeId}
                            onChange={(e) => {
                                setTypeId(e.target.value);
                                setCategoryId("");
                                clearError("typeId");
                                clearError("categoryId");
                            }}
                            className={inputClass + " bg-[#0A0A0C]"}
                        >
                            <option value="" className="bg-[#0A0A0C]">Choose a type...</option>
                            {types.map((t) => (
                                <option key={t.id} value={t.id} className="bg-[#0A0A0C]">{t.name}</option>
                            ))}
                        </select>
                    </Field>

                    <Field id={`${uid}-category`} label="Category" error={errors.categoryId}>
                        <select
                            id={`${uid}-category`}
                            disabled={!typeId}
                            value={categoryId}
                            onChange={(e) => {
                                setCategoryId(e.target.value);
                                clearError("categoryId");
                            }}
                            className={inputClass + " bg-[#0A0A0C]"}
                        >
                            <option value="" className="bg-[#0A0A0C]">Choose a category...</option>
                            {categoriesOfType.map((c) => (
                                <option key={c.id} value={c.id} className="bg-[#0A0A0C]">{c.name}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <Field id={`${uid}-name`} label="Item name" error={errors.name}>
                    <input
                        id={`${uid}-name`}
                        type="text"
                        maxLength={80}
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            clearError("name");
                        }}
                        className={inputClass}
                    />
                </Field>

                <Field id={`${uid}-description`} label="Description" error={errors.description} hint={`${description.length}/300`}>
                    <textarea
                        id={`${uid}-description`}
                        rows={3}
                        maxLength={300}
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            clearError("description");
                        }}
                        className={inputClass + " resize-none"}
                    />
                </Field>

                <Field id={`${uid}-price`} label="Price" error={errors.price} hint="In rupees. For example 149 or 149.50">
                    <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/50">₹</span>
                        <input
                            id={`${uid}-price`}
                            type="text"
                            inputMode="decimal"
                            maxLength={9}
                            value={price}
                            onChange={(e) => {
                                setPrice(e.target.value.replace(/[^\d.]/g, ""));
                                clearError("price");
                            }}
                            className={inputClass + " pl-9"}
                        />
                    </div>
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                    <ImageField
                        id={`${uid}-main`}
                        label="Main picture"
                        file={mainImage}
                        currentUrl={item.mainThumb}
                        onChange={(f) => {
                            setMainImage(f);
                            clearError("mainImage");
                        }}
                        error={errors.mainImage}
                    />
                    <ImageField
                        id={`${uid}-second`}
                        label="Second picture"
                        file={secondImage}
                        currentUrl={item.secondThumb}
                        onChange={(f) => {
                            setSecondImage(f);
                            clearError("secondImage");
                        }}
                        error={errors.secondImage}
                    />
                </div>
            </fieldset>

            <div aria-live="polite">
                {formError && (
                    <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{formError}</p>
                )}
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                    className="w-full cursor-pointer rounded-full border border-white/30 py-2.5 text-sm text-white/80 transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full cursor-pointer rounded-full border border-white bg-white py-2.5 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {busy ? status || "Working..." : "Save changes"}
                </button>
            </div>
        </form>
    );
}