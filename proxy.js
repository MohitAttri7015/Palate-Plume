
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/token";
import { LOGIN_PATH, STAFF_PAGES, STAFF_API, homeFor } from "@/lib/config";

const startsWithAny = (path, list) => list.some((p) => path === p || path.startsWith(p + "/"));

export default async function proxy(request) {
    const { pathname } = request.nextUrl;
    const isApi = pathname.startsWith("/api/");
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

    // Login page: if the person is already logged in, send them to their own home screen.
    if (pathname === LOGIN_PATH) {
        if (session) return NextResponse.redirect(new URL(homeFor(session.role), request.url));
        return NextResponse.next();
    }

    // Nobody logged in.
    if (!session) {
        if (isApi) return NextResponse.json({ error: "Please log in." }, { status: 401 });
        return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }

    // Staff can only open the kitchen area.
    if (session.role === "staff") {
        const allowed = isApi ? startsWithAny(pathname, STAFF_API) : startsWithAny(pathname, STAFF_PAGES);
        if (!allowed) {
            if (isApi) return NextResponse.json({ error: "You are not allowed to do this." }, { status: 403 });
            return NextResponse.redirect(new URL(homeFor("staff"), request.url));
        }
    }

    return NextResponse.next(); // admin, or staff on an allowed page
}

// Which addresses the guard watches. (This list must be written out as plain text.)
export const config = {
    matcher: ["/login", "/admin/:path*", "/api/admin/:path*"],
};
