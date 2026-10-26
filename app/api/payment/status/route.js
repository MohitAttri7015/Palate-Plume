// GET /api/payment/status?sitting=<id> -> { paid: true | false }   (asked every 2 seconds while the QR is on screen)
// It only needs the signed table cookie, NOT a still-valid table: after staff press "Mark paid" the table is reset,
// and this answer is exactly how the customer's phone learns the bill was paid.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGuest } from "@/lib/guest";
import { payStatus } from "@/lib/billing";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request) {
    try {
        if (await getSession()) return json({ error: "Staff cannot use this." }, 401);
        const guest = await getGuest();
        if (!guest) return json({ error: "Scan the QR code on your table first." }, 401);

        const sitting = new URL(request.url).searchParams.get("sitting");
        if (!sitting || sitting.length > 64) return json({ error: "Bad request." }, 400);

        return json(await payStatus(guest, sitting));
    } catch (err) {
        console.error("Payment status error:", err);
        return json({ error: "Something went wrong on our side." }, 500);
    }
}