// Makes and checks the login "ticket" (a signed token kept in a cookie).
// No Next.js imports here, so proxy.js can use this file too.
import { SignJWT, jwtVerify } from "jose";

const isProd = process.env.NODE_ENV === "production";
const ISSUER = "palateplume";
const ROLES = ["admin", "staff"];

// In production the name starts with "__Host-". Browsers then REFUSE the cookie
// unless it is Secure, has path "/" and has no Domain, which blocks cookie tricks.
export const SESSION_COOKIE = isProd ? "__Host-pp_session" : "pp_session";
export const SESSION_HOURS = 12; // after this the person must log in again

// Rules for the cookie itself:
//  httpOnly -> JavaScript in the page can never read it (protects against XSS theft)
//  secure   -> sent over https only (on the live site)
//  sameSite -> not sent on requests started by other websites (protects against CSRF)
export const cookieOptions = { httpOnly: true, secure: isProd, sameSite: "lax", path: "/" };

function getKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short. Add a 64-character random value to your .env file.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken({ userId, role, cafeId, username }) {
  return new SignJWT({ role, cafeId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getKey());
}

// Returns { userId, role, cafeId, username } or null if missing / fake / expired / unknown role.
export async function verifySessionToken(token) {
  if (!token) return null;
  const key = getKey();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"], issuer: ISSUER });
    if (!payload.sub || !ROLES.includes(payload.role)) return null;
    return {
      userId: payload.sub,
      role: payload.role,
      cafeId: payload.cafeId,
      username: payload.username,
    };
  } catch {
    return null;
  }
}
