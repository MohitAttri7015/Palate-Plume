// POST /api/payment/start -> "show me the QR code to pay my table's bill"
import { NextResponse } from "next/server";
import { requireGuest } from "@/lib/requireGuest";
import { startPayment } from "@/lib/billing";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const PROBLEMS = {
    TABLE_FULL: [403, "This table already has the maximum number of people."],
    ALREADY_PAID: [409, "This bill is already paid."],
    NO_BILL: [400, "There is nothing to pay yet."],
    NOT_SET_UP: [503, "Online payment is not available right now. Please pay at the staff and tell them your table number."],
    PAY_LOCKED: [423, "We found a problem while you were paying. Please pay at the staff and tell them your table number."],
    BUSY: [503, "Please try again in a moment."],
};

export async function POST() {
    try {
        const { guest, error } = await requireGuest();
        if (error) return error;

        const result = await startPayment(guest);
        if (result.error) {
            const [status, message] = PROBLEMS[result.error] ?? [400, "Bad request."];
            return json({ code: result.error, error: message }, status);
        }
        return json(result.attempt);
    } catch (err) {
        console.error("Start payment error:", err);
        return json({ code: "SERVER_ERROR", error: "Something went wrong on our side. Please try again." }, 500);
    }
}