// SERVER ONLY. Everything about paying the bill of a table.
import mongoose from "mongoose";
import QRCode from "qrcode";
import { connectDB } from "@/lib/db";
import Table from "@/models/Table";
import TableCart from "@/models/TableCart";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import { readCart } from "@/lib/tableCart";
import { shapeOrder } from "@/lib/orders";
import { upiLink, validUpiId } from "@/lib/upi";

export const MAX_FAILS = 3; // failed / expired tries before the customer is told to pay at the staff
export const QR_MS = 5 * 60 * 1000; // how long one QR code lives
const ACTIVE_MS = 3 * 60 * 1000;

const sittingOf = (doc) => doc.sitting || String(doc._id);

async function ready() {
    await connectDB();
    await Payment.init(); // makes sure the unique index exists
}

// The bill of one sitting = every order that was not cancelled.
async function billOf(tableId, sitting) {
    const orders = await Order.find({ tableId, sitting, status: { $ne: "cancelled" } }).sort({ createdAt: 1 }).lean();
    return { orders, totalPaise: orders.reduce((sum, o) => sum + o.totalPaise, 0) };
}

async function shapeAttempt(pay, table, now) {
    const upiUrl = upiLink({
        pa: process.env.UPI_ID.trim(),
        pn: process.env.UPI_NAME?.trim() || "Palate & Plume",
        amountPaise: pay.amountPaise,
        note: `Table ${table}`,
    });
    const qrSvg = await QRCode.toString(upiUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    return {
        attempt: {
            id: pay.attemptId,
            amountPaise: pay.amountPaise,
            msLeft: Math.max(0, pay.expiresAt.getTime() - now),
            upiUrl,
            qrSvg,
            fails: pay.fails,
            maxFails: MAX_FAILS,
        },
    };
}

// Customer: "show me the QR for my table's bill".
// Returns { attempt } or { error: ALREADY_PAID | NO_BILL | NOT_SET_UP | PAY_LOCKED | BUSY | TABLE_FULL }
export async function startPayment(guest) {
    const cart = await readCart(guest);
    if (cart.error) return { error: cart.error };
    const sitting = cart.sitting;

    await ready();
    if (await Payment.exists({ tableId: guest.tableId, sitting })) return { error: "ALREADY_PAID" };

    const { totalPaise } = await billOf(guest.tableId, sitting);
    if (totalPaise <= 0) return { error: "NO_BILL" };
    if (!validUpiId(process.env.UPI_ID?.trim())) return { error: "NOT_SET_UP" };

    for (let i = 0; i < 4; i++) {
        const now = Date.now();
        const doc = await TableCart.findOne({ tableId: guest.tableId, epoch: guest.epoch }).select("pay").lean();
        if (!doc) return { error: "BUSY" };

        const raw = doc.pay;
        const pay = raw && raw.sitting === sitting ? raw : null; // a payment of an older sitting does not count
        const fails = pay?.fails ?? 0;
        if (fails >= MAX_FAILS) return { error: "PAY_LOCKED" };

        const live = Boolean(pay?.attemptId) && pay.expiresAt.getTime() > now;
        if (live && pay.amountPaise === totalPaise) return shapeAttempt(pay, guest.table, now); // same QR for everyone at the table

        // The old QR ran out without being reported: that counts as one failed try.
        // (A QR replaced because the bill grew does NOT count.)
        const newFails = pay?.attemptId && !live ? fails + 1 : fails;
        if (newFails >= MAX_FAILS) {
            await TableCart.updateOne({ _id: doc._id }, { $set: { pay: { sitting, attemptId: null, amountPaise: 0, fails: newFails } } });
            return { error: "PAY_LOCKED" };
        }

        const next = { sitting, attemptId: crypto.randomUUID(), amountPaise: totalPaise, expiresAt: new Date(now + QR_MS), fails: newFails };
        // Only save if nobody else made a new QR in the meantime; if they did, we loop and reuse theirs.
        const res = await TableCart.updateOne({ _id: doc._id, "pay.attemptId": raw?.attemptId ?? null }, { $set: { pay: next } });
        if (res.matchedCount === 1) return shapeAttempt(next, guest.table, now);
    }
    return { error: "BUSY" };
}

// Customer: "my payment did not go through".
export async function reportPayFail(guest, attemptId) {
    await connectDB();
    const key = { tableId: guest.tableId, epoch: guest.epoch };
    const hit = await TableCart.findOneAndUpdate(
        { ...key, "pay.attemptId": attemptId },
        { $inc: { "pay.fails": 1 }, $set: { "pay.attemptId": null } },
        { returnDocument: "after" }
    )
        .select("pay")
        .lean();
    const doc = hit ?? (await TableCart.findOne(key).select("pay").lean());
    const fails = doc?.pay?.fails ?? 0;
    return { fails, maxFails: MAX_FAILS, locked: fails >= MAX_FAILS };
}

// Customer phone: "has my table's bill been paid?" Works even after the table was reset.
export async function payStatus(guest, sitting) {
    await ready();
    const paid = await Payment.findOne({ tableId: guest.tableId, sitting }).select("createdAt").lean();
    return { paid: Boolean(paid) };
}

// New epoch = empty cart, and every phone at the table is logged out of it. Old orders stay in the database.
export async function resetTable(cafeId, tableId) {
    await connectDB();
    const res = await Table.updateOne({ _id: tableId, cafeId }, { $inc: { epoch: 1 } });
    return res.matchedCount === 1;
}

// Staff: "this table has paid". totalPaise = the amount staff saw on their screen.
export async function markPaid(session, { tableId, sitting, totalPaise, method, payer }) {
    await ready();
    const cafeId = session.cafeId;
    const table = await Table.findOne({ _id: tableId, cafeId }).select("number epoch").lean();
    if (!table) return { error: "NO_TABLE" };

    const cart = await TableCart.findOne({ tableId, epoch: table.epoch }).select("sitting").lean();
    if (!cart || sittingOf(cart) !== sitting) return { error: "STALE" };

    const { orders, totalPaise: bill } = await billOf(tableId, sitting);
    if (bill <= 0) return { error: "NO_BILL" };
    if (bill !== totalPaise) return { error: "BILL_CHANGED" }; // the bill changed after staff looked at it

    try {
        await Payment.create({
            cafeId,
            tableId,
            tableNumber: table.number,
            sitting,
            orders: orders.map((o) => ({
                orderId: o._id,
                at: o.createdAt,
                items: o.items.map((l) => ({ name: l.name, qty: l.qty, unitPaise: l.unitPaise })),
                totalPaise: o.totalPaise,
            })),
            totalPaise: bill,
            method,
            payer,
            paidBy: session.username,
        });
    } catch (err) {
        if (err?.code === 11000) return { error: "ALREADY_PAID" };
        throw err;
    }
    await resetTable(cafeId, tableId);
    return { ok: true };
}

// Staff: every active table with its current bill.
export async function tableBoard(cafeId) {
    await connectDB();
    await Order.init();
    const now = Date.now();

    const tables = await Table.find({ cafeId, isActive: true }).select("number epoch").sort({ number: 1 }).lean();
    if (tables.length === 0) return [];

    const carts = await TableCart.find({ cafeId, $or: tables.map((t) => ({ tableId: t._id, epoch: t.epoch })) }).lean();
    const cartOf = new Map(carts.map((c) => [String(c.tableId), c]));

    const sittings = carts.map(sittingOf);
    const orders = sittings.length
        ? await Order.find({ cafeId, tableId: { $in: carts.map((c) => c.tableId) }, sitting: { $in: sittings } }).sort({ createdAt: 1 }).lean()
        : [];

    return tables.map((t) => {
        const cart = cartOf.get(String(t._id));
        const sitting = cart ? sittingOf(cart) : null;
        const mine = cart ? orders.filter((o) => String(o.tableId) === String(t._id) && o.sitting === sitting) : [];
        const pay = cart?.pay && cart.pay.sitting === sitting ? cart.pay : null;
        return {
            tableId: String(t._id),
            number: t.number,
            sitting,
            orders: mine.map(shapeOrder),
            totalPaise: mine.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.totalPaise, 0),
            people: cart ? cart.guests.filter((g) => now - g.seenAt.getTime() < ACTIVE_MS).length : 0,
            paying: Boolean(pay?.attemptId) && pay.expiresAt.getTime() > now,
            locked: (pay?.fails ?? 0) >= MAX_FAILS,
        };
    });
}

// One paid bill as the browser may see it. The same dish ordered twice shows once.
function shapePayment(p) {
    const lines = new Map();
    for (const o of p.orders) for (const l of o.items) {
        const key = `${l.name}|${l.unitPaise}`;
        lines.set(key, { name: l.name, unitPaise: l.unitPaise, qty: (lines.get(key)?.qty ?? 0) + l.qty });
    }
    return {
        id: String(p._id),
        tableNumber: p.tableNumber,
        totalPaise: p.totalPaise,
        method: p.method,
        payer: p.payer,
        paidBy: p.paidBy,
        at: new Date(p.createdAt).toISOString(),
        items: [...lines.values()],
    };
}

// Staff: paid bills.
//   paidHistory(cafeId)                          -> everything paid since midnight (India time)
//   paidHistory(cafeId, { all: true, before })   -> ALL payments, newest first, 30 per page.
//                                                   `next` is the "before" value for the next page (null = the end).
//                                                   The first page also carries `summary` = count and total of all time.
export async function paidHistory(cafeId, { all = false, before = null, limit = 30 } = {}) {
    await ready();

    if (!all) {
        const IST = 5.5 * 3600 * 1000;
        const local = Date.now() + IST;
        const since = new Date(local - (local % (24 * 3600 * 1000)) - IST);
        const list = await Payment.find({ cafeId, createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(300).lean();
        const payments = list.map(shapePayment);
        return { payments, totalPaise: payments.reduce((sum, p) => sum + p.totalPaise, 0) };
    }

    const filter = { cafeId };
    if (before) filter.createdAt = { $lt: before };
    const rows = await Payment.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean(); // one extra row = "is there another page?"
    const page = rows.slice(0, limit);
    const result = {
        payments: page.map(shapePayment),
        next: rows.length > limit ? new Date(page[page.length - 1].createdAt).toISOString() : null,
    };
    if (!before) {
        const [sum] = await Payment.aggregate([
            { $match: { cafeId: new mongoose.Types.ObjectId(String(cafeId)) } },
            { $group: { _id: null, count: { $sum: 1 }, totalPaise: { $sum: "$totalPaise" } } },
        ]);
        result.summary = { count: sum?.count ?? 0, totalPaise: sum?.totalPaise ?? 0 };
    }
    return result;
}