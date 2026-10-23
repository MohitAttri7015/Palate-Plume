// Helpers for table QR codes. SERVER ONLY.
import crypto from "node:crypto";

// The address the QR codes point to. Set SITE_URL in .env if you ever move to your own domain
// (and print new QR codes, because the address is inside every code).
export const SITE_URL = (process.env.SITE_URL || "https://palate-plume.vercel.app").replace(/\/+$/, "");

// 9 random bytes = 72 bits of randomness, written as 12 URL-safe characters. Impossible to guess.
export const newTableToken = () => crypto.randomBytes(9).toString("base64url");
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{12}$/;

export const scanUrl = (token) => `${SITE_URL}/t/${token}`;