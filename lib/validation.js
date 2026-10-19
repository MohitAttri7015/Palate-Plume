// The rules for what the admin forms may send. The SERVER checks these every time,
// because anything coming from a browser can be faked.
import { z } from "zod";

export const categorySchema = z.object({
    typeId: z.string().min(1, "Please choose a type (Food or Drink)."),
    name: z.string().trim().min(1, "Please enter a category name.").max(40, "Category name is too long (max 40 characters)."),
});

const pictureSchema = z.object({
    url: z.string().max(600),
    fileId: z.string().regex(/^[A-Za-z0-9]{8,40}$/, "That picture is not valid. Please upload it again."),
});

export const itemSchema = z.object({
    name: z.string().trim().min(2, "Please enter the item name (at least 2 letters).").max(80, "Name is too long (max 80 characters)."),
    categoryId: z.string().min(1, "Please choose a category."),
    description: z.string().trim().min(1, "Please write a short description.").max(300, "Description is too long (max 300 characters)."),
    // The price arrives as TEXT like "149" or "149.50", so no decimal rounding can happen in the browser.
    price: z.string().trim().regex(/^\d{1,6}(\.\d{1,2})?$/, "Enter a price like 149 or 149.50."),
    mainImage: pictureSchema,
    secondImage: pictureSchema.nullable().optional(),
});

// Turns zod's complaints into { fieldName: "friendly message" } so the form can show them under the right box.
export function fieldErrorsFrom(zodError) {
    const out = {};
    for (const issue of zodError.issues) {
        const key = issue.path[0] ?? "form";
        if (out[key]) continue;
        out[key] = issue.code === "invalid_type" ? "This field is required." : issue.message;
    }
    return out;
}

// A real database id is exactly 24 letters/numbers (0-9, a-f).
export const isObjectIdString = (value) => typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);

// "  Iced   Latte " -> "Iced Latte"
export const tidy = (text) => text.replace(/\s+/g, " ").trim();