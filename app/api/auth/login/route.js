import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createSessionToken, SESSION_COOKIE, SESSION_HOURS, cookieOptions } from "@/lib/token";
import { retryAfterSeconds, recordFailure, clearFailures } from "@/lib/rateLimit";
import { homeFor } from "@/lib/config";
import { GUEST_COOKIE, guestCookieOptions } from "@/lib/guest";

// Used when the username does not exist, so the answer takes the same time
// as a real check and nobody can discover which usernames exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const MAX_PER_USER = 5; // wrong tries per username (per computer) before blocking
const MAX_PER_IP = 20; // wrong tries per computer before blocking

// Never let the browser or a proxy cache login answers.
const json = (body, status = 200, headers = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ code: "MISSING_FIELDS", error: "Please enter your username and password." }, 400);
  }

  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password || username.length > 50 || password.length > 200) {
    return json({ code: "MISSING_FIELDS", error: "Please enter your username and password." }, 400);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const userKey = `user:${ip}:${username}`;
  const ipKey = `ip:${ip}`;

  const [waitUser, waitIp] = await Promise.all([
    retryAfterSeconds(userKey, MAX_PER_USER),
    retryAfterSeconds(ipKey, MAX_PER_IP),
  ]);
  const wait = Math.max(waitUser, waitIp);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return json(
      {
        code: "TOO_MANY_ATTEMPTS",
        error: `Too many wrong attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        retryAfter: wait,
      },
      429,
      { "Retry-After": String(wait) }
    );
  }

  try {
    await connectDB();
    const user = await User.findOne({ username }).select("+passwordHash").lean();

    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) {
      await Promise.all([recordFailure(userKey), recordFailure(ipKey)]);
      // Same message for "no such user" and "wrong password" on purpose.
      return json({ code: "WRONG_CREDENTIALS", error: "Wrong username or password." }, 401);
    }

    await clearFailures(userKey);

    const token = await createSessionToken({
      userId: String(user._id),
      role: user.role,
      cafeId: String(user.cafeId),
      username: user.username,
    });

    const res = json({ ok: true, role: user.role, redirectTo: homeFor(user.role) });
    res.cookies.set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_HOURS * 60 * 60 });
    // This browser may still hold a table (guest) cookie from an earlier QR scan. Staff are not customers, so end it.
    res.cookies.set(GUEST_COOKIE, "", { ...guestCookieOptions, maxAge: 0 });
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return json({ code: "SERVER_ERROR", error: "Something went wrong on our side. Please try again in a moment." }, 500);
  }
}
