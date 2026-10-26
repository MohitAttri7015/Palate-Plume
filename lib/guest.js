// The "guest session": how the server remembers which table a customer's phone is at, WITHOUT any login.
// It is a signed cookie created when someone scans a table QR code. SERVER ONLY.
//
// It is kept completely separate from the staff/admin login:
//  - a different cookie name,
//  - a different signing key (JWT_SECRET + ":guest"),
//  - a different issuer and audience.
// So a guest cookie can never be used as a staff login, and a staff cookie is never accepted as a guest.
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import Table from "@/models/Table";
import { getSession } from "@/lib/auth";

const isProd = process.env.NODE_ENV === "production";
const ISSUER = "palateplume-guest";
const AUDIENCE = "table-guest";

export const GUEST_COOKIE = isProd ? "__Host-pp_guest" : "pp_guest";
export const GUEST_HOURS = 4; // a sitting at a table; after this the guest scans again
export const guestCookieOptions = { httpOnly: true, secure: isProd, sameSite: "lax", path: "/" };

function getKey() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error("JWT_SECRET is missing or too short.");
    return new TextEncoder().encode(`${secret}:guest`);
}

// sid = a random id for this phone/visit. It is the "who", the table is the "where".
export async function createGuestToken({ sid, tableId, table, cafeId, epoch }) {
    return new SignJWT({ tid: tableId, tbl: table, cid: cafeId, ep: epoch })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(sid)
        .setIssuedAt()
        .setExpirationTime(`${GUEST_HOURS}h`)
        .sign(getKey());
}

export async function verifyGuestToken(token) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE });
        if (!payload.sub || typeof payload.tid !== "string" || typeof payload.cid !== "string") return null;
        if (!Number.isInteger(payload.tbl) || !Number.isInteger(payload.ep)) return null;
        return { sid: payload.sub, tableId: payload.tid, table: payload.tbl, cafeId: payload.cid, epoch: payload.ep };
    } catch {
        return null;
    }
}

// Reads the guest cookie in a server page or API route. Only checks the signature.
export async function getGuest() {
    const store = await cookies();
    return verifyGuestToken(store.get(GUEST_COOKIE)?.value);
}

// Same, but ALSO checks the table still exists, is switched on and has not had its QR code replaced.
// Use this wherever the table really matters (the cart page now, placing an order later).
export async function getValidGuest() {
    
    if (await getSession()) return null;

    const guest = await getGuest();
    if (!guest) return null;
    try {
        await connectDB();
        const table = await Table.findOne({ _id: guest.tableId, cafeId: guest.cafeId, isActive: true, epoch: guest.epoch })
            .select("_id")
            .lean();
        return table ? guest : null;
    } catch (err) {
        console.error("Guest check error:", err);
        return null;
    }
}