// SERVER ONLY. How a menu item is sent to the admin's menu manager (one shape for the page and for the save answers).
import { paiseToText } from "@/lib/money";

const endpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/+$/, "");
// A small picture is enough for a list (ImageKit shrinks it for us).
const thumb = (url) => (!url ? "" : endpoint && url.startsWith(endpoint) && !url.includes("?") ? `${url}?tr=w-240,q-70` : url);

export const adminItem = (item) => ({
    id: String(item._id),
    name: item.name,
    description: item.description,
    price: paiseToText(item.price), // "149" or "149.50", the same text the add form uses
    categoryId: String(item.categoryId),
    mainThumb: thumb(item.mainImage?.url),
    secondThumb: thumb(item.secondImage?.url),
    isAvailable: item.isAvailable !== false,
});