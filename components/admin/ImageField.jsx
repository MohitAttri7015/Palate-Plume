"use client";
import { useEffect, useRef, useState } from "react";
import { Field } from "@/components/admin/FormParts";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;

// A picture chooser with a preview.
//   file     = the chosen picture (or null)
//   onChange = called with the new picture, or null when removed
export default function ImageField({ id, label, hint, file, onChange, error }) {
    const inputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [localError, setLocalError] = useState("");

    // Make a temporary address so the browser can show the chosen picture,
    // and throw it away again when the picture changes or the page closes.
    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    function handleChange(e) {
        const chosen = e.target.files?.[0];
        e.target.value = ""; // so you can choose the same file again later
        if (!chosen) return;

        if (!ALLOWED_TYPES.includes(chosen.type)) {
            return setLocalError("Please choose a JPG, PNG or WebP picture.");
        }
        if (chosen.size > MAX_MB * 1024 * 1024) {
            setLocalError(`That picture is too big. The maximum is ${MAX_MB} MB.`);
            return;
        }
        setLocalError("");
        onChange(chosen);
    }

    const shownError = error || localError;

    return (
        <Field id={id} label={label} hint={hint} error={shownError}>
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleChange}
                tabIndex={-1}
                aria-invalid={shownError ? true : undefined}
                aria-describedby={shownError ? `${id}-error` : undefined}
                className="sr-only"
            />

            {file && previewUrl ? (
                <div className="flex items-center gap-4 rounded-lg border border-[#333] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`Preview of ${label}`} className="h-20 w-20 shrink-0 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#ccc]">{file.name}</p>
                        <p className="text-xs text-white/40">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <div className="mt-2 flex gap-4 text-xs">
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="cursor-pointer text-white/70 underline underline-offset-4 hover:text-white"
                            >
                                Change
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLocalError("");
                                    onChange(null);
                                }}
                                className="cursor-pointer text-white/70 underline underline-offset-4 hover:text-red-300"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#444] px-4 py-8 text-sm text-white/60 transition-colors hover:border-white/50 hover:text-white"
                >
                    <span>Choose a picture</span>
                    <span className="text-xs text-white/30">JPG, PNG or WebP, up to {MAX_MB} MB</span>
                </button>
            )}
        </Field>
    );
}