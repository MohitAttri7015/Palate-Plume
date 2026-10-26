// SERVER ONLY. "Is this request from a customer's phone that sits at a valid table?"
// Same check as getValidGuest(), but a database problem becomes an error answer (the phone can try again)
// instead of looking like "you have no table".
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getGuest } from "@/lib/guest";
import Table from "@/models/Table";

const no = (error, status) => NextResponse.json({ code: "NO_TABLE", error }, { status, headers: { "Cache-Control": "no-store" } });

export async function requireGuest() {
    // Someone logged in as staff or admin is not a customer, even if an old table cookie is still in this browser.
    if (await getSession()) return { error: no("You are logged in as staff, so this browser cannot order as a customer.", 401) };

    const guest = await getGuest(); // valid signed cookie?
    if (!guest) return { error: no("Scan the QR code on your table first.", 401) };

    await connectDB();
    const table = await Table.findOne({ _id: guest.tableId, cafeId: guest.cafeId, isActive: true, epoch: guest.epoch })
        .select("_id")
        .lean();
    if (!table) return { error: no("This table is not active any more.", 401) };
    return { guest };
}