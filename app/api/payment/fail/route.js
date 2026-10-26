// POST /api/payment/fail  { attemptId } -> "my payment did not go through"
import { NextResponse } from "next/server";
import { requireGuest } from "@/lib/requireGuest";
import { reportPayFail } from "@/lib/billing";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
    try {
        const { guest, error } = await requireGuest();
        if (error) return error;

        const body = await request.json().catch(() => null);
        const attemptId = body?.attemptId;
        if (typeof attemptId !== "string" || attemptId.length > 64) return json({ error: "Bad request." }, 400);

        return json(await reportPayFail(guest, attemptId));
    } catch (err) {
        console.error("Payment fail error:", err);
        return json({ code: "SERVER_ERROR", error: "Something went wrong on our side." }, 500);
    }
}