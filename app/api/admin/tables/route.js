import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { isObjectIdString } from "@/lib/validation";
import { newTableToken } from "@/lib/tables";
import Table from "@/models/Table";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const createSchema = z.object({ count: z.number().int().min(1).max(50) });
const changeSchema = z.object({ id: z.string(), action: z.enum(["regenerate", "disable", "enable"]) });

// Create tables 1..count (only the ones that do not exist yet). Existing tables and their QR codes are never touched.
export async function POST(request) {
    const { session, error } = await requireAdmin();
    if (error) return error;

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Please enter how many tables you have." }, 400);
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Enter a number of tables between 1 and 50." }, 400);

    try {
        await connectDB();
        await Table.init(); // makes sure the "no duplicates" rules exist in the database

        const existing = await Table.find({ cafeId: session.cafeId }).select("number").lean();
        const have = new Set(existing.map((t) => t.number));
        const docs = [];
        for (let n = 1; n <= parsed.data.count; n++) {
            if (!have.has(n)) docs.push({ cafeId: session.cafeId, number: n, token: newTableToken() });
        }
        if (docs.length > 0) await Table.insertMany(docs);

        return json({ ok: true, created: docs.length }, 201);
    } catch (err) {
        if (err?.code === 11000) return json({ error: "Please try again." }, 409);
        console.error("Create tables error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}

// regenerate = new secret (the printed QR code stops working), disable / enable = switch a table off or on.
export async function PATCH(request) {
    const { session, error } = await requireAdmin();
    if (error) return error;

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Bad request." }, 400);
    }
    const parsed = changeSchema.safeParse(body);
    if (!parsed.success || !isObjectIdString(parsed.data.id)) return json({ error: "Bad request." }, 400);

    const { id, action } = parsed.data;
    // Replacing the code or switching a table off also raises `epoch`, which ends guest sessions already open at that table.
    const update =
        action === "regenerate"
            ? { $set: { token: newTableToken() }, $inc: { epoch: 1 } }
            : action === "disable"
                ? { $set: { isActive: false }, $inc: { epoch: 1 } }
                : { $set: { isActive: true } };

    try {
        await connectDB();
        // cafeId comes from the login, so an admin can only change their own cafe's tables
        const table = await Table.findOneAndUpdate({ _id: id, cafeId: session.cafeId }, update, { new: true }).select("number isActive").lean();
        if (!table) return json({ error: "That table does not exist." }, 404);
        return json({ ok: true, table: { id, number: table.number, isActive: table.isActive } });
    } catch (err) {
        if (err?.code === 11000) return json({ error: "Please try again." }, 409);
        console.error("Change table error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}