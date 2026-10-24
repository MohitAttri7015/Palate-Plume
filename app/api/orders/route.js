// POST /api/orders  -> "place the order for everything in my table's cart".
// The phone sends NOTHING: the items come from the shared cart in the database and the
// prices from the menu in the database, so there is nothing a customer could fake.
import { NextResponse } from "next/server";
import { requireGuest } from "@/lib/requireGuest";
import { placeOrder } from "@/lib/orders";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const PROBLEMS = {
    TABLE_FULL: [403, "This table already has the maximum number of people."],
    EMPTY_CART: [400, "Your cart is empty."],
    ITEM_UNAVAILABLE: [409, "Some items are no longer available. Please refresh the page and check your cart."],
    CART_CHANGED: [409, "The cart at your table just changed (someone may have already placed the order). Please check your cart and your orders."],
};

export async function POST() {
    try {
        const { guest, error } = await requireGuest();
        if (error) return error;

        const result = await placeOrder(guest);
        if (result.error) {
            const [status, message] = PROBLEMS[result.error] ?? [400, "Bad request."];
            return json({ code: result.error, error: message }, status);
        }
        return json({ ok: true, orderId: String(result.order._id) }, 201);
    } catch (err) {
        console.error("Place order error:", err);
        return json({ code: "SERVER_ERROR", error: "Something went wrong on our side. Please try again." }, 500);
    }
}