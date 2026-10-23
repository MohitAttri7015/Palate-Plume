// The shared cart of a table.
//   GET  /api/table-cart?since=7   -> the phone asks "anything new since version 7?" (every 2 seconds)
//   POST /api/table-cart           -> the phone says "add one of this" / "remove one" / "clear"
// WHICH table it is always comes from the signed guest cookie, never from what the browser sends.
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { getGuest } from "@/lib/guest";
import { MAX_QTY } from "@/lib/cartMath";
import { readCart, changeCart, clearCart } from "@/lib/tableCart";
import Table from "@/models/Table";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const PROBLEMS = {
    TABLE_FULL: [403, "This table already has the maximum number of people."],
    ITEM_GONE: [404, "That item is no longer available."],
};

const schema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("change"),
        id: z.string().regex(/^[a-f0-9]{24}$/i),
        delta: z.number().int().min(-MAX_QTY).max(MAX_QTY).refine((n) => n !== 0),
    }),
    z.object({ action: z.literal("clear") }),
]);

// Same check as getValidGuest(), but a database problem becomes a 500 (the phone just tries again)
// instead of looking like "your table is gone" (which would make the phone drop its shared cart).
async function requireGuest() {
    const guest = await getGuest(); // is there a valid signed cookie?
    if (!guest) return { error: json({ code: "NO_TABLE", error: "Scan the QR code on your table." }, 401) };

    await connectDB();
    const table = await Table.findOne({ _id: guest.tableId, cafeId: guest.cafeId, isActive: true, epoch: guest.epoch })
        .select("_id")
        .lean();
    if (!table) return { error: json({ code: "NO_TABLE", error: "This table is not active any more." }, 401) };
    return { guest };
}

const answer = (result) => {
    if (!result.error) return json(result.state);
    const [status, error] = PROBLEMS[result.error] ?? [400, "Bad request."];
    return json({ code: result.error, error }, status);
};

export async function GET(request) {
    try {
        const { guest, error } = await requireGuest();
        if (error) return error;

        const result = await readCart(guest);
        if (result.error) return answer(result);

        // The phone already has this version: send a tiny "nothing new" answer instead of the whole cart.
        const since = Number(new URL(request.url).searchParams.get("since"));
        if (result.state.version === since) {
            return json({ unchanged: true, people: result.state.people, maxPeople: result.state.maxPeople });
        }
        return answer(result);
    } catch (err) {
        console.error("Read table cart error:", err);
        return json({ code: "SERVER_ERROR", error: "Something went wrong on our side." }, 500);
    }
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Bad request." }, 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return json({ error: "Bad request." }, 400);

    try {
        const { guest, error } = await requireGuest();
        if (error) return error;

        const cmd = parsed.data;
        const result =
            cmd.action === "clear"
                ? await clearCart(guest)
                : await changeCart(guest, { id: cmd.id.toLowerCase(), delta: cmd.delta });
        return answer(result);
    } catch (err) {
        console.error("Change table cart error:", err);
        return json({ code: "SERVER_ERROR", error: "Something went wrong on our side." }, 500);
    }
}