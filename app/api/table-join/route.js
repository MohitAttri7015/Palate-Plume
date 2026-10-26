// POST /api/table-join  { number: 5, code: "K7M2X" }  -> "I am sitting at table 5" (typed by hand instead of scanning the QR code).
// Same result as a scan: a guest cookie for that table.
// The number alone is NOT enough: the code printed on the table card is needed too, so nobody can take a seat at a
// table they are not sitting at. Wrong tries are counted per computer AND per table, so the code cannot be guessed.
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Table from "@/models/Table";
import { retryAfterSeconds, recordFailure } from "@/lib/rateLimit";
import { GUEST_COOKIE, GUEST_HOURS, guestCookieOptions } from "@/lib/guest";
import { CODE_PATTERN, codeMatches } from "@/lib/tables";
import { seatGuest } from "@/lib/joinTable";

const MAX_WRONG = 15; // wrong tries per computer (per 15 minutes). Customers share the cafe Wi-Fi, so this is not tiny.
const MAX_WRONG_PER_TABLE = 40; // wrong codes for ONE table from all computers together (per 15 minutes)
const schema = z.object({ number: z.number().int().min(1).max(99), code: z.string() });
const NO_MATCH = "That table number and code do not match. Please check the card on your table.";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const ipKey = `join:${ip}`;

    if ((await retryAfterSeconds(ipKey, MAX_WRONG)) > 0) {
        return json({ error: "Too many tries. Please wait a few minutes or ask a member of our team." }, 429);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Please enter your table number and the code from your table card." }, 400);
    }
    const parsed = schema.safeParse(body);
    const code = parsed.success ? parsed.data.code.trim().toUpperCase() : "";
    if (!parsed.success || !CODE_PATTERN.test(code)) {
        return json({ error: "Please enter your table number and the 5-character code from your table card." }, 400);
    }

    const number = parsed.data.number;
    const tableKey = `join-table:${number}`;
    if ((await retryAfterSeconds(tableKey, MAX_WRONG_PER_TABLE)) > 0) {
        return json({ error: "Joining this table by code is paused for a few minutes. Please scan the QR code on your table or ask a member of our team." }, 429);
    }

    try {
        await connectDB();
        // One cafe only, so the number alone finds the table. A switched-off table looks the same as one that does not exist.
        const table = await Table.findOne({ number, isActive: true }).lean();

        if (!table || !codeMatches(table.token, code)) {
            await recordFailure(ipKey);
            if (table) await recordFailure(tableKey); // many wrong codes for one table, from any computer
            return json({ error: NO_MATCH }, 404);
        }

        const seat = await seatGuest(table, request.cookies.get(GUEST_COOKIE)?.value);
        if (seat.full) {
            const res = json({ code: "TABLE_FULL", error: "This table is full right now. Please ask a member of our team for help." }, 403);
            res.cookies.set(GUEST_COOKIE, "", { ...guestCookieOptions, maxAge: 0 }); // drop an old cookie of this phone
            return res;
        }

        const res = json({ ok: true, table: table.number });
        res.cookies.set(GUEST_COOKIE, seat.jwt, { ...guestCookieOptions, maxAge: GUEST_HOURS * 60 * 60 });
        return res;
    } catch (err) {
        console.error("Join table error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}