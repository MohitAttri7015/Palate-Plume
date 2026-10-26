// Loads the menu from MongoDB for the home page sliders. SERVER ONLY.
import { cache } from "react";
import { connection } from "next/server";
import { connectDB } from "@/lib/db";
import { isObjectIdString } from "@/lib/validation";
import Type from "@/models/Type";
import Category from "@/models/Category";
import MenuItem from "@/models/MenuItem";
import { shapeMenu, pickFeaturedFood, pickMocktailItems, pickFirstCategories } from "@/lib/homeMenuLogic";

// cache() = the three home sections share ONE database load per page visit.
const loadMenu = cache(async () => {
    await connection(); // live data + random picks, so this page is rendered per visit
    try {
        await connectDB();
        const [types, categories, items] = await Promise.all([
            Type.find().lean(),
            Category.find({isActive: { $ne: false } }).sort({ sortOrder: 1, name: 1 }).lean(),
            MenuItem.find().sort({ sortOrder: 1 }).lean(), // sold-out items stay visible (shown as "Sold out")
        ]);
        return shapeMenu({ types, categories, items });
    } catch (err) {
        console.error("Load home menu error:", err);
        return []; // the sections hide themselves instead of crashing the home page
    }
});

export async function getFeaturedFood(count = 5) {
    return pickFeaturedFood(await loadMenu(), count);
}

export async function getMocktailItems() {
    return pickMocktailItems(await loadMenu());
}

export async function getHomeCategories(count = 6) {
    return pickFirstCategories(await loadMenu(), count);
}