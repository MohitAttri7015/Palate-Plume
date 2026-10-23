// SERVER ONLY. Everything about the shared cart of one table and the phones sitting at it.
import { connectDB } from "@/lib/db";
import { applyDelta } from "@/lib/cartMath";
import TableCart from "@/models/TableCart";
import MenuItem from "@/models/MenuItem";

export const MAX_GUESTS = 4; // phones allowed at one table
const ACTIVE_MS = 3 * 60 * 1000; // a phone we have not heard from for 3 minutes gives its seat back
const TOUCH_MS = 20 * 1000; // refresh a phone's "last seen" at most every 20 s (saves database writes)
const ABANDONED_MS = 60 * 60 * 1000; // nobody at the table for 1 hour: the old cart is thrown away
const KEEP_MS = 12 * 60 * 60 * 1000; // a cart nobody touches for 12 hours is deleted by the database
const TRIES = 8; // how often we redo a save when phones save at the same moment (4 phones at most, so this is plenty)

const isActive = (guest, now) => now - guest.seenAt.getTime() < ACTIVE_MS;

async function ready() {
    await connectDB();
    await TableCart.init(); // makes sure the unique index and the auto-delete index exist
}

// Finds the cart of this table, or creates an empty one.
async function loadOrCreate(guest) {
    const key = { tableId: guest.tableId, epoch: guest.epoch };
    for (let i = 0; i < 2; i++) {
        const found = await TableCart.findOne(key).lean();
        if (found) return found;
        const now = Date.now();
        try {
            const created = await TableCart.create({
                ...key,
                cafeId: guest.cafeId,
                lastActiveAt: new Date(now),
                expiresAt: new Date(now + KEEP_MS),
            });
            return created.toObject();
        } catch (err) {
            if (err?.code !== 11000) throw err; // 11000 = another phone created it a moment ago, so we just read it again
        }
    }
    throw new Error("Could not create the table cart.");
}

// "Is there a seat for this phone?" Returns:
//   {}                 -> already seated and fresh, nothing to save
//   { guests: [...] }  -> the new list of seated phones (to save)
//   { error: "TABLE_FULL" }
function seatFor(doc, sid, now) {
    const active = doc.guests.filter((g) => isActive(g, now)); // phones that left are dropped from the list here
    const mine = active.find((g) => g.sid === sid);

    if (mine) {
        const fresh = now - mine.seenAt.getTime() < TOUCH_MS;
        if (fresh && active.length === doc.guests.length) return {};
        return { guests: active.map((g) => (g.sid === sid ? { sid, seenAt: new Date(now) } : g)) };
    }
    if (active.length >= MAX_GUESTS) return { error: "TABLE_FULL" };
    return { guests: [...active, { sid, seenAt: new Date(now) }] };
}

// What a phone is allowed to see.
function view(doc, now) {
    return {
        version: doc.version,
        items: doc.items.map(({ id, qty }) => ({ id, qty })),
        people: doc.guests.filter((g) => isActive(g, now)).length,
        maxPeople: MAX_GUESTS,
    };
}

// The heart of the file: "read the cart, change it, save it, but ONLY if nobody saved in between".
// `rev` is the check. If two phones tap at the same moment, one save fails and is simply redone
// with the newest data, so no tap is ever lost.
async function mutate(guest, change) {
    await ready();
    for (let attempt = 0; attempt < TRIES; attempt++) {
        const found = await loadOrCreate(guest);
        const now = Date.now();

        // Nobody was here for an hour: the cart belongs to customers who left. Start clean.
        const abandoned = now - found.lastActiveAt.getTime() > ABANDONED_MS;
        const doc = abandoned ? { ...found, items: [], guests: [] } : found;

        const next = change(doc, now);
        if (next.error) return { error: next.error };

        const changes = { ...next };
        if (abandoned && !changes.items) changes.items = []; // the clean-up has to be saved too
        if (Object.keys(changes).length === 0) return { state: view(doc, now) }; // nothing to save

        const $set = { lastActiveAt: new Date(now), expiresAt: new Date(now + KEEP_MS) };
        const $inc = { rev: 1 };
        if (changes.guests) $set.guests = changes.guests;
        if (changes.items) {
            $set.items = changes.items;
            $inc.version = 1;
        }

        const res = await TableCart.updateOne({ _id: found._id, rev: found.rev }, { $set, $inc });
        if (res.matchedCount === 1) {
            const saved = { ...doc, ...changes, version: found.version + (changes.items ? 1 : 0) };
            return { state: view(saved, now) };
        }
        // matchedCount 0 = someone else saved first. Wait a tiny random moment (so two phones do not
        // keep colliding at exactly the same time), then loop: read again and redo our change.
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 25 * (attempt + 1)));
    }
    throw new Error("The table cart is too busy. Please try again.");
}

// guest = { sid, tableId, cafeId, epoch } (from the guest cookie)

// Used by the 2-second refresh. Also keeps this phone's seat alive.
export const readCart = (guest) => mutate(guest, (doc, now) => seatFor(doc, guest.sid, now));

// delta = +1 / -1 (or more). Adding something that does not exist (or is sold out) is refused.
export async function changeCart(guest, { id, delta }) {
    if (delta > 0) {
        await ready();
        const exists = await MenuItem.exists({ _id: id, cafeId: guest.cafeId, isAvailable: { $ne: false } });
        if (!exists) return { error: "ITEM_GONE" };
    }
    return mutate(guest, (doc, now) => {
        const seat = seatFor(doc, guest.sid, now);
        if (seat.error) return seat;
        return { ...seat, items: applyDelta(doc.items, id, delta) };
    });
}

// Empties the shared cart (for example after the order was placed).
export const clearCart = (guest) =>
    mutate(guest, (doc, now) => {
        const seat = seatFor(doc, guest.sid, now);
        if (seat.error) return seat;
        return { ...seat, items: [] };
    });