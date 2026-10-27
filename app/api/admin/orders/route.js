// The kitchen's orders. Admin AND staff may use this.
//   GET   /api/admin/orders?since=<stamp>   -> the orders of the last 12 hours (or "unchanged")
//   PATCH /api/admin/orders  { id, status } -> move one order to a new status
// The cafe always comes from the login (session.cafeId), never from what the browser sends.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/requireStaff";
import { isObjectIdString } from "@/lib/validation";
import { STATUSES } from "@/lib/orderStatus";
import { ordersForKitchen, ordersHistory, shapeOrder, stampOf, changeOrderStatus } from "@/lib/orders";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const changeSchema = z.object({ id: z.string(), status: z.enum(STATUSES) });

export async function GET(request) {
    const { session, error } = await requireStaff();
    if (error) return error;
    try {
        const params = new URL(request.url).searchParams;
        if (params.get("view") === "history") {
            const raw = params.get("before");
            const before = raw ? new Date(raw) : null;
            const status = params.get("status");
            if ((before && Number.isNaN(before.getTime())) || (status && !STATUSES.includes(status))) return json({ error: "Bad request." }, 400);
            return json(await ordersHistory(session.cafeId, { before, status }));
        }

        const orders = await ordersForKitchen(session.cafeId);
        const stamp = stampOf(orders);
        if (params.get("since") === stamp) return json({ unchanged: true });
        return json({ stamp, orders: orders.map(shapeOrder) });
    } catch (err) {
        console.error("Kitchen orders error:", err);
        return json({ error: "Something went wrong on our side." }, 500);
    }
}

export async function PATCH(request) {
    const { session, error } = await requireStaff();
    if (error) return error;

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Bad request." }, 400);
    }
    const parsed = changeSchema.safeParse(body);
    if (!parsed.success || !isObjectIdString(parsed.data.id)) return json({ error: "Bad request." }, 400);

    try {
        const result = await changeOrderStatus(session.cafeId, parsed.data.id, parsed.data.status);
        if (result.error) {
            return json({ code: "CANNOT_CHANGE", error: "This order was already changed by someone else. The board has been refreshed." }, 409);
        }
        return json({ ok: true, order: result.order });
    } catch (err) {
        console.error("Change order status error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}