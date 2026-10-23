// The cart page asks: "what are these items called and what do they cost RIGHT NOW?"
// Only public menu information comes back. Prices are in paise (whole numbers).
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import MenuItem from "@/models/MenuItem";
import Category from "@/models/Category";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const schema = z.object({
    items: z
        .array(z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i), qty: z.number().int().min(1).max(20) }))
        .min(1)
        .max(40),
});

// A small picture is enough for the cart (ImageKit shrinks it for us).
const endpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/+$/, "");
const small = (url) => (endpoint && url.startsWith(endpoint) && !url.includes("?") ? `${url}?tr=w-240,q-70` : url);

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Bad request." }, 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: "Bad request." }, 400);

    const ids = [...new Set(parsed.data.items.map((i) => i.id.toLowerCase()))];

    try {
        await connectDB();
        const items = await MenuItem.find({ _id: { $in: ids }, isAvailable: { $ne: false } })
            .select("name price mainImage categoryId")
            .lean();
        const categories = await Category.find({ _id: { $in: items.map((i) => i.categoryId) } }).select("name").lean();
        const categoryName = new Map(categories.map((c) => [String(c._id), c.name]));

        const found = new Set(items.map((i) => String(i._id)));
        return json({
            lines: items.map((i) => ({
                id: String(i._id),
                name: i.name,
                category: categoryName.get(String(i.categoryId)) ?? "",
                unitPaise: i.price,
                image: small(i.mainImage.url),
            })),
            unavailable: ids.filter((id) => !found.has(id)), // deleted or sold out since they were added
        });
    } catch (err) {
        console.error("Cart quote error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}