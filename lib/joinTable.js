// SERVER ONLY. Gives a phone a seat at a table and makes its guest cookie.
// Used when someone TYPES a table number (the QR scan route does the same steps by itself).
import { readCart } from "@/lib/tableCart";
import { createGuestToken, verifyGuestToken } from "@/lib/guest";

// table = a Table document (lean). cookieValue = the phone's current guest cookie (or undefined).
// Returns { jwt } or { full: true }.
export async function seatGuest(table, cookieValue) {
    const tableId = String(table._id);
    const existing = await verifyGuestToken(cookieValue);

    // Same table again keeps the same guest id. A different table gets a fresh one.
    const sameTable = existing && existing.tableId === tableId && existing.epoch === table.epoch;
    const sid = sameTable ? existing.sid : crypto.randomUUID();

    const guest = { sid, tableId, cafeId: String(table.cafeId), epoch: table.epoch };
    const seat = await readCart(guest); // takes a seat; refuses when the table already has the maximum number of phones
    if (seat.error === "TABLE_FULL") return { full: true };

    const jwt = await createGuestToken({ ...guest, table: table.number });
    return { jwt };
}