// SERVER ONLY. Turns the shared cart of a table into an order.
import { connectDB } from "@/lib/db";
import MenuItem from "@/models/MenuItem";
import Order from "@/models/Order";
import { readCart, takeCart, putCartBack } from "@/lib/tableCart";
import { normalizeStatus, fromStatuses, STATUSES, NEXT } from "@/lib/orderStatus";

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


/* ───────── Reading orders and changing their status ───────── */

// What the browser is allowed to see of an order.
export const shapeOrder = (o) => ({
    id: String(o._id),
    tableNumber: o.tableNumber,
    status: normalizeStatus(o.status),
    createdAt: new Date(o.createdAt).toISOString(),
    totalPaise: o.totalPaise,
    items: o.items.map((l) => ({ name: l.name, qty: l.qty, unitPaise: l.unitPaise })),
});

// A short "fingerprint" of a list of orders. It changes when an order is added or its status changes.
// The phone sends the fingerprint it already has; if it still matches, we answer "unchanged" (a tiny reply).
export const stampOf = (orders) =>
    `${orders.length}:${orders.reduce((max, o) => Math.max(max, new Date(o.updatedAt).getTime()), 0)}`;

// Everything ordered by the people at this table during this sitting (so every phone at the table sees every order).
export async function ordersForSitting(guest, sitting) {
    await connectDB();
    await Order.init();
    return Order.find({ cafeId: guest.cafeId, tableId: guest.tableId, sitting }).sort({ createdAt: 1 }).lean();
}

// The kitchen board: every order that still needs work (never cut off by a count), plus the last few finished ones.
const OPEN = STATUSES.filter((s) => NEXT[s].length > 0); // pending, accepted, preparing
const FINISHED = STATUSES.filter((s) => NEXT[s].length === 0); // served, cancelled
const OPEN_HOURS = 24; // an unfinished order older than this is forgotten (for example an old test order)
const FINISHED_HOURS = 12;
const FINISHED_SHOWN = 20;

export async function ordersForKitchen(cafeId) {
    await connectDB();
    await Order.init();
    const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

    // 1) Orders that still need work. Newest first with a very high safety limit, so if something
    //    ever goes wrong, the NEWEST orders are the ones kept. Then turned around: oldest first on the board.
    const open = await Order.find({ cafeId, status: { $in: [...OPEN, "new"] }, createdAt: { $gte: hoursAgo(OPEN_HOURS) } })
        .sort({ createdAt: -1 })
        .limit(300)
        .lean();

    // 2) The orders finished most recently ("new" was the old name of "pending", so it never belongs here).
    const finished = await Order.find({ cafeId, status: { $in: FINISHED }, updatedAt: { $gte: hoursAgo(FINISHED_HOURS) } })
        .sort({ updatedAt: -1 })
        .limit(FINISHED_SHOWN)
        .lean();

    return [...open.reverse(), ...finished.reverse()];
}

// Moves an order to a new status, but ONLY if it is in a status that is allowed to move there.
// The check and the change happen in ONE database step, so two staff members pressing together cannot clash.
export async function changeOrderStatus(cafeId, id, to) {
    await connectDB();
    const order = await Order.findOneAndUpdate(
        { _id: id, cafeId, status: { $in: fromStatuses(to) } },
        { $set: { status: to } },
        { returnDocument: "after" }
    )
        .select("status")
        .lean();
    return order ? { order: { id: String(order._id), status: order.status } } : { error: "CANNOT_CHANGE" };
}