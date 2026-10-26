// What happens when someone scans a table QR code: /t/<secret>
// 1) check the secret, 2) give the phone a guest session for that table, 3) send it to the menu.
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Table from "@/models/Table";
import { TOKEN_PATTERN } from "@/lib/tables";
import { retryAfterSeconds, recordFailure } from "@/lib/rateLimit";
import { GUEST_COOKIE, GUEST_HOURS, guestCookieOptions, createGuestToken, verifyGuestToken } from "@/lib/guest";
import { readCart } from "@/lib/tableCart";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/token";

const MAX_BAD_SCANS = 15; // wrong codes per computer (per 15 minutes) before we stop answering

const go = (request, path) =>
    new NextResponse(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store" } });

export async function GET(request, { params }) {
    const { token } = await params;
    // Logged in as staff or admin? Then this browser is not a customer's, so it gets no table session.
    // (To try the customer side, open the table link in a private window.)
    if (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return go(request, "/table-staff");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const key = `scan:${ip}`;

    // Someone trying many wrong codes is blocked for a while.
    if ((await retryAfterSeconds(key, MAX_BAD_SCANS)) > 0) return go(request, "/table-help");

    if (!TOKEN_PATTERN.test(token)) {
        await recordFailure(key);
        return go(request, "/table-help");
    }

    try {
        await connectDB();
        const table = await Table.findOne({ token, isActive: true }).lean();
        if (!table) {
            await recordFailure(key);
            return go(request, "/table-help");
        }

        // Scanning the same table again keeps the same guest id. A different table gets a fresh one.
        const existing = await verifyGuestToken(request.cookies.get(GUEST_COOKIE)?.value);
        const sameTable = existing && existing.tableId === String(table._id) && existing.epoch === table.epoch;
        const sid = sameTable ? existing.sid : crypto.randomUUID();

        // NEW: take a seat at the table. If it already has the maximum number of phones, no guest cookie is handed out.
        const seat = await readCart({ sid, tableId: String(table._id), cafeId: String(table.cafeId), epoch: table.epoch });
        if (seat.error === "TABLE_FULL") {
            const full = go(request, "/table-full");
            full.cookies.set(GUEST_COOKIE, "", { ...guestCookieOptions, maxAge: 0 }); // also drop an old cookie of this phone
            return full;
        }

        const jwt = await createGuestToken({
            sid,
            tableId: String(table._id),
            table: table.number,
            cafeId: String(table.cafeId),
            epoch: table.epoch,
        });

        const res = go(request, "/menu");
        res.cookies.set(GUEST_COOKIE, jwt, { ...guestCookieOptions, maxAge: GUEST_HOURS * 60 * 60 });
        return res;
    } catch (err) {
        console.error("Scan error:", err);
        return go(request, "/table-help");
    }
}