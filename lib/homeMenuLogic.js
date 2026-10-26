// Pure helpers (no database, no Next.js) that turn saved menu data into what the home page sliders need.

// The cocktail slider shows items from categories with these names (lowercase, any capitals in the database are fine).
export const MOCKTAIL_CATEGORIES = ["mocktails"];

const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function shuffle(list, random = Math.random) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// Prices are saved in paise, cards use rupees.
export function shapeMenu({ types = [], categories = [], items = [] }) {
    const typeName = new Map(types.map((t) => [String(t._id), String(t.name ?? "").trim().toLowerCase()]));

    const itemsByCategory = new Map();
    for (const item of items) {
        if (!item.mainImage?.url) continue; // an item without a picture would break the image component
        const key = String(item.categoryId);
        if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
        itemsByCategory.get(key).push(item);
    }

    return categories.map((category) => {
        const cards = (itemsByCategory.get(String(category._id)) ?? []).map((item) => ({
            id: String(item._id),
            name: item.name,
            category: category.name,
            price: item.price / 100,
            image: item.mainImage.url,
            hoverImage: item.secondImage?.url || undefined,
            soldOut: item.isAvailable === false,
        }));
        return {
            id: String(category._id),
            name: category.name,
            slug: slugify(category.name),
            type: typeName.get(String(category.typeId)) ?? "",
            image: cards[0]?.image ?? "", // the category tile uses the first item's picture
            items: cards,
        };
    });
}

// Featured tasting: `count` random food items, each from a different food category when possible.
export function pickFeaturedFood(menu, count = 5, random = Math.random) {
    // Sold-out items are never picked as "featured".
    const foodCategories = menu
        .map((c) => ({ ...c, items: c.items.filter((i) => !i.soldOut) }))
        .filter((c) => c.type === "food" && c.items.length > 0);
    const picks = shuffle(foodCategories, random)
        .slice(0, count)
        .map((c) => c.items[Math.floor(random() * c.items.length)]);

    // Fewer than `count` food categories? Fill up with other random food items.
    if (picks.length < count) {
        const used = new Set(picks.map((p) => p.id));
        const rest = shuffle(foodCategories.flatMap((c) => c.items).filter((i) => !used.has(i.id)), random);
        picks.push(...rest.slice(0, count - picks.length));
    }
    return picks;
}

// Cocktail slider: every item of the cocktail categories.
export function pickMocktailItems(menu) {
    return menu
        .filter((c) => MOCKTAIL_CATEGORIES.includes(c.name.trim().toLowerCase()))
        .flatMap((c) => c.items);
}

// Category section: the first `count` categories (in the order set by sortOrder) that have items.
export function pickFirstCategories(menu, count = 6) {
    return menu.filter((c) => c.items.length > 0 && c.image).slice(0, count);
}