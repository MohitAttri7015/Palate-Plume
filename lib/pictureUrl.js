// Checks that a picture address really points to THIS cafe's folder in OUR ImageKit.
// The browser tells the server the picture address after uploading, and the server
// must never believe it blindly (someone could send any address they like).
import { getImageKitConfig, folderFor } from "@/lib/imagekit";

export function isOurPictureUrl(url, cafeId) {
    if (typeof url !== "string") return false;
    const { urlEndpoint } = getImageKitConfig();
    const prefix = `${urlEndpoint}${folderFor(cafeId)}/`; // e.g. https://ik.imagekit.io/myid/menu/<cafeId>/
    if (!url.startsWith(prefix)) return false;

    const fileName = url.slice(prefix.length);
    // one plain file name: no sub-folders, no spaces, no ?query or #part, and a picture ending
    return /^[^/?#\s]+\.(jpe?g|png|webp)$/i.test(fileName);
}