// POST /api/table-join  { number: 5 }  -> "I am sitting at table 5" (typed by hand instead of scanning the QR code).
// Same result as a scan: a guest cookie for that table. Wrong numbers are counted, so nobody can try numbers all day.
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Table from "@/models/Table";
import { retryAfterSeconds, recordFailure } from "@/lib/rateLimit";
import { GUEST_COOKIE, GUEST_HOURS, guestCookieOptions } from "@/lib/guest";
import { seatGuest } from "@/lib/joinTable";

const MAX_WRONG = 10; // wrong numbers per computer (per 15 minutes) before we stop answering
const schema = z.object({ number: z.number().int().min(1).max(99) });

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const key = `join:${ip}`;

    if ((await retryAfterSeconds(key, MAX_WRONG)) > 0) {
        return json({ error: "Too many tries. Please wait a few minutes or ask a member of our team." }, 429);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Please enter your table number." }, 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        await recordFailure(key);
        return json({ error: "There is no table with that number." }, 404);
    }

    try {
        await connectDB();
        // One cafe only, so the number alone is enough. A switched-off table looks the same as one that does not exist.
        const table = await Table.findOne({ number: parsed.data.number, isActive: true }).lean();
        if (!table) {
            await recordFailure(key);
            return json({ error: "There is no table with that number." }, 404);
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