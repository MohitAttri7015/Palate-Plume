// SERVER ONLY. Turns the shared cart of a table into an order.
import { connectDB } from "@/lib/db";
import MenuItem from "@/models/MenuItem";
import Order from "@/models/Order";
import { readCart, takeCart, putCartBack } from "@/lib/tableCart";

// guest = { sid, tableId, table, cafeId, epoch } (from the guest cookie)
// Returns { order } or { error: "TABLE_FULL" | "EMPTY_CART" | "ITEM_UNAVAILABLE" | "CART_CHANGED" }.
export async function placeOrder(guest) {
    // 1) What is in the shared cart right now?
    const cart = await readCart(guest);
    if (cart.error) return { error: cart.error };
    const lines = cart.state.items;
    if (lines.length === 0) return { error: "EMPTY_CART" };

    // 2) Names and prices come from OUR database. The phone is never asked for them, so they cannot be faked.
    await connectDB();
    await Order.init(); // makes sure the indexes exist
    const menu = await MenuItem.find({
        _id: { $in: lines.map((l) => l.id) },
        cafeId: guest.cafeId,
        isAvailable: { $ne: false },
    })
        .select("name price")
        .lean();
    const byId = new Map(menu.map((m) => [String(m._id), m]));
    if (lines.some((l) => !byId.has(l.id))) return { error: "ITEM_UNAVAILABLE" }; // sold out or deleted a moment ago

    const items = lines.map((l) => ({
        itemId: l.id,
        name: byId.get(l.id).name,
        qty: l.qty,
        unitPaise: byId.get(l.id).price,
    }));
    const totalPaise = items.reduce((sum, i) => sum + i.unitPaise * i.qty, 0);

    // 3) Take the items out of the cart. This only works if nobody changed the cart since step 1.
    const taken = await takeCart(guest, cart.state.version);
    if (taken.error) return { error: taken.error };

    // 4) Save the order. If that fails, give the items back so nothing is lost.
    try {
        const order = await Order.create({
            cafeId: guest.cafeId,
            tableId: guest.tableId,
            tableNumber: guest.table,
            sitting: cart.sitting,
            items,
            totalPaise,
        });
        return { order };
    } catch (err) {
        await putCartBack(guest, lines).catch(() => { });
        throw err;
    }
}