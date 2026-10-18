// The rules for what the admin forms may send. The SERVER checks these every time,
// because anything coming from a browser can be faked.
import { z } from "zod";

export const categorySchema = z.object({
    name: z.string().trim().min(1, "Please enter a category name.").max(40, "Category name is too long (max 40 characters)."),
});

// "  Iced   Latte " -> "Iced Latte"
export const tidy = (text) => text.replace(/\s+/g, " ").trim();