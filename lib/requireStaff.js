// For the kitchen: admin AND staff may use these routes (requireAdmin.js is admin only).
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireStaff() {
    const session = await getSession();
    if (!session) return { error: NextResponse.json({ error: "Please log in." }, { status: 401 }) };
    return { session }; // role is "admin" or "staff"
}