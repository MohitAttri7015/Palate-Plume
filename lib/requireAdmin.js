// proxy.js already blocks visitors, but each route checks again (two locks are safer than one).
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireAdmin() {
    const session = await getSession();
    if (!session) {
        return { error: NextResponse.json({ error: "Please log in." }, { status: 401 }) };
    }
    if (session.role !== "admin") {
        return { error: NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 }) };
    }
    return { session };
}