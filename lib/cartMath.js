// Pure helper (no database, no React). Used by the SERVER and by the BROWSER, so both do the same maths.
export const MAX_QTY = 20; // of one item
export const MAX_LINES = 40; // different items in one cart

// items = [{ id, qty }]. Returns a NEW list where `delta` was added to one item.
// The quantity never goes below 0 (0 removes the item) or above MAX_QTY.
export function applyDelta(items, id, delta) {
    const qtyById = new Map(items.map((row) => [row.id, row.qty]));
    const qty = (qtyById.get(id) ?? 0) + delta;
    if (qty <= 0) qtyById.delete(id);
    else if (qtyById.has(id) || qtyById.size < MAX_LINES) qtyById.set(id, Math.min(MAX_QTY, qty));
    return [...qtyById].map(([itemId, itemQty]) => ({ id: itemId, qty: itemQty }));
}