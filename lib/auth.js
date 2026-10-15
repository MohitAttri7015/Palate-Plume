// Use getSession() inside server pages and API routes to find out who is logged in.
// Returns { userId, role, cafeId, username } or null when nobody is logged in.
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/token";

export async function getSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
