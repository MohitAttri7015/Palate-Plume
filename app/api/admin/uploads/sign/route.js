import { NextResponse } from "next/server";
import { createUploadAuth, folderFor, getImageKitConfig, UPLOAD_URL } from "@/lib/imagekit";
import { requireAdmin } from "@/lib/requireAdmin";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// The browser asks for a permission slip before uploading a picture.
export async function POST() {

    const { session, error } = await requireAdmin();
    if (error) return error;


    try {
        const { publicKey } = getImageKitConfig();
        const { token, expire, signature } = createUploadAuth();

        return json({
            token,
            expire,
            signature,
            publicKey, // the public key is meant to be public. The PRIVATE key never leaves the server.
            folder: folderFor(session.cafeId), // this cafe's own folder
            uploadUrl: UPLOAD_URL,
        });
    } catch (err) {
        console.error("Upload sign error:", err);
        return json({ error: "Picture upload is not set up yet. Check the ImageKit settings in your .env file." }, 500);
    }
}