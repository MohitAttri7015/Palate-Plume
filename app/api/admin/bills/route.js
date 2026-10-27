// Staff and admin: the bills of every table.
//   GET  /api/admin/bills?since=<stamp>   -> every table with its orders and total (tiny reply when nothing changed)
//   GET  /api/admin/bills?view=paid       -> everything paid today
//   POST { action: "paid", tableId, sitting, totalPaise, method, payer }  -> mark paid (and reset the table)
//   POST { action: "reset", tableId }                                      -> reset the table (works even if full)
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStaff } from "@/lib/requireStaff";
import { tableBoard, paidHistory, markPaid, resetTable } from "@/lib/billing";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const PROBLEMS = {
    NO_TABLE: [404, "This table does not exist any more."],
    STALE: [409, "This table changed while you were looking at it. The list has been refreshed."],
    NO_BILL: [400, "This table has nothing to pay."],
    BILL_CHANGED: [409, "The bill changed a moment ago (a new order or a cancellation). Check the new total and try again."],
    ALREADY_PAID: [409, "This bill is already marked as paid."],
};

// A short fingerprint of the board, so an unchanged board is answered with a tiny reply.
function stampOf(text) {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return `${text.length}:${h}`;
}

export async function GET(request) {
    try {
        const { session, error } = await requireStaff();
        if (error) return error;

        const params = new URL(request.url).searchParams;
        if (params.get("view") === "paid") return json(await paidHistory(session.cafeId));
        if (params.get("view") === "all") {
            const raw = params.get("before");
            const before = raw ? new Date(raw) : null;
            if (before && Number.isNaN(before.getTime())) return json({ error: "Bad request." }, 400);
            return json(await paidHistory(session.cafeId, { all: true, before }));
        }

        const tables = await tableBoard(session.cafeId);
        const stamp = stampOf(JSON.stringify(tables));
        if (params.get("since") === stamp) return json({ unchanged: true });
        return json({ stamp, tables });
    } catch (err) {
        console.error("Bills read error:", err);
        return json({ error: "Something went wrong on our side." }, 500);
    }
}

export async function POST(request) {
    try {
        const { session, error } = await requireStaff();
        if (error) return error;

        const body = await request.json().catch(() => null);
        if (!body || !mongoose.isValidObjectId(body.tableId)) return json({ error: "Bad request." }, 400);

        if (body.action === "reset") {
            const ok = await resetTable(session.cafeId, body.tableId);
            return ok ? json({ ok: true }) : json({ error: PROBLEMS.NO_TABLE[1] }, 404);
        }

        if (body.action === "paid") {
            const method = ["upi", "cash", "card"].includes(body.method) ? body.method : "upi";
            const payer = typeof body.payer === "string" ? body.payer.trim().slice(0, 60) : "";
            if (typeof body.sitting !== "string" || body.sitting.length > 64) return json({ error: "Bad request." }, 400);
            if (!Number.isInteger(body.totalPaise) || body.totalPaise <= 0) return json({ error: "Bad request." }, 400);

            const result = await markPaid(session, { tableId: body.tableId, sitting: body.sitting, totalPaise: body.totalPaise, method, payer });
            if (result.error) {
                const [status, message] = PROBLEMS[result.error] ?? [400, "Bad request."];
                return json({ code: result.error, error: message }, status);
            }
            return json({ ok: true });
        }

        return json({ error: "Bad request." }, 400);
    } catch (err) {
        console.error("Bills write error:", err);
        return json({ error: "Something went wrong on our side." }, 500);
    }
}