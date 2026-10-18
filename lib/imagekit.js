// SERVER-ONLY helpers for ImageKit (never import this file in a "use client" file,
// because it reads the private key).
import crypto from "node:crypto";

export const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

// Reads your 3 ImageKit settings from the .env file.
export function getImageKitConfig() {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    if (!publicKey || !privateKey || !urlEndpoint) {
        throw new Error("ImageKit settings are missing in the .env file.");
    }
    return { publicKey, privateKey, urlEndpoint: urlEndpoint.replace(/\/+$/, "") };
}

// Every cafe gets its own folder in ImageKit: /menu/<cafeId>
export const folderFor = (cafeId) => `/menu/${cafeId}`;

// A one-time "permission slip" that lets the browser upload ONE picture.
//   token     = a random one-time code
//   expire    = the slip stops working after 10 minutes
//   signature = proof that WE made the slip (made with the private key)
export function createUploadAuth() {
    const { privateKey } = getImageKitConfig();
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 10 * 60;
    const signature = crypto.createHmac("sha1", privateKey).update(token + expire).digest("hex");
    return { token, expire, signature };
}