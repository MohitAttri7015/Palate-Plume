// Loads the whole menu ONCE per page visit, grouped for the /menu page:
//   Food  -> its categories -> their items
//   Drink -> its categories -> their items
// The page then switches between categories in the browser, so changing a category needs no new request.
// SERVER ONLY.
import { connection } from "next/server";
import { connectDB } from "@/lib/db";
import Type from "@/models/Type";
import Category from "@/models/Category";
import MenuItem from "@/models/MenuItem";

const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ImageKit can shrink a picture on the fly. The cards are small, so ask for 800px:
// a smaller download and less graphics memory on phones.
const endpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/+$/, "");
const sized = (url) => (endpoint && url.startsWith(endpoint) && !url.includes("?") ? `${url}?tr=w-800,q-80` : url);

export async function getMenuGroups() {
    await connection(); // live data: the menu changes whenever the admin adds something
    try {
        await connectDB();
        const [types, categories, items] = await Promise.all([
            Type.find().sort({ _id: 1 }).lean(), // Food first, then Drink (the order you added them in Atlas)
            Category.find({ isActive: { $ne: false } }).sort({ sortOrder: 1, name: 1 }).lean(),
            MenuItem.find().sort({ sortOrder: 1 }).lean(), // sold-out items stay on the menu (shown as "Sold out")
        ]);

        const itemsByCategory = new Map();
        for (const item of items) {
            if (!item.mainImage?.url) continue; // an item without a picture cannot be shown
            const key = String(item.categoryId);
            if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
            itemsByCategory.get(key).push(item);
        }

        return types
            .map((type) => ({
                key: slugify(type.name),
                label: type.name,
                categories: categories
                    .filter((c) => String(c.typeId) === String(type._id))
                    .map((c) => ({
                        id: String(c._id),
                        name: c.name,
                        slug: slugify(c.name),
                        items: (itemsByCategory.get(String(c._id)) ?? []).map((item) => ({
                            id: String(item._id),
                            name: item.name,
                            category: c.name,
                            description: item.description,
                            price: item.price / 100, // paise -> rupees
                            image: sized(item.mainImage.url),
                            soldOut: item.isAvailable === false,
                        })),
                    }))
                    .filter((c) => c.items.length > 0), // empty categories stay out of the dropdown
            }))
            .filter((g) => g.categories.length > 0);
    } catch (err) {
        console.error("Load menu error:", err);
        return [];
    }
}