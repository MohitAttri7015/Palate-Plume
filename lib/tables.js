// Helpers for table QR codes. SERVER ONLY.
import crypto from "node:crypto";

// The address the QR codes point to. Set SITE_URL in .env if you ever move to your own domain
// (and print new QR codes, because the address is inside every code).
export const SITE_URL = ("https://palate-plume.vercel.app").replace(/\/+$/, "");

// 9 random bytes = 72 bits of randomness, written as 12 URL-safe characters. Impossible to guess.
export const newTableToken = () => crypto.randomBytes(9).toString("base64url");
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export const scanUrl = (token) => `${SITE_URL}/t/${token}`;


/* ───────── The table code ─────────
   A short code printed on every table card, next to the table number. Typing a table NUMBER alone is not
   enough to join a table (anybody could do that from home): the code proves that you can see the card.
   It is worked out from the table's secret token, so nothing extra is stored in the database, and
   "New QR code" in the admin gives the table a new code too. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0 or 1 (easy to mix up when typing)
export const CODE_LENGTH = 5;
export const CODE_PATTERN = /^[A-HJKMNP-Z2-9]{5}$/;

export function tableCode(token) {
    const digest = crypto.createHmac("sha256", process.env.JWT_SECRET).update(`table-code:${token}`).digest();
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[digest[i] % CODE_ALPHABET.length];
    return code;
}

// Compares what the customer typed with the real code (without leaking how many letters were right).
export function codeMatches(token, typed) {
    const real = Buffer.from(tableCode(token));
    const given = Buffer.from(String(typed));
    return real.length === given.length && crypto.timingSafeEqual(real, given);
}