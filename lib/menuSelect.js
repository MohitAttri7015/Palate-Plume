// Pure helpers (no database, no React) for the /menu page. Safe to import in client components.
//   groups    = [{ key: "food", label: "Food", categories: [{ id, name, slug, items: [...] }] }, ...]
//   selection = { type: "food", slug: "all" }   ("all" = every category of that type)

export function defaultSelection(groups) {
    return { type: groups[0]?.key ?? "", slug: "all" };
}

// Which group + category does a category address (like /menu/mocktails) belong to?
export function selectionForCategory(groups, slug) {
    const group = groups.find((g) => g.categories.some((c) => c.slug === slug));
    return group ? { type: group.key, slug } : null;
}

// The items to show for the current selection, as one flat list.
export function itemsFor(groups, selection) {
    const group = groups.find((g) => g.key === selection.type) ?? groups[0];
    if (!group) return [];
    const chosen = selection.slug === "all" ? group.categories : group.categories.filter((c) => c.slug === selection.slug);
    const categories = chosen.length > 0 ? chosen : group.categories; // unknown slug: fall back to the whole type
    return categories.flatMap((c) => c.items);
}