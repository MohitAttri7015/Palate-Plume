import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { itemSchema, fieldErrorsFrom, isObjectIdString, tidy } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import { isOurPictureUrl } from "@/lib/pictureUrl";
import Category from "@/models/Category";
import MenuItem from "@/models/MenuItem";
import { requireAdmin } from "@/lib/requireAdmin";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const badFields = (fieldErrors, status = 400) => json({ error: "Please fix the highlighted fields.", fieldErrors }, status);

// Create a menu item.
export async function POST(request) {
    
    const { session, error } = await requireAdmin();
    if (error) return error;

    // 2) Read what the browser sent.
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Please fill in the form." }, 400);
    }

    // 3) Check every field follows the rules. Fields we don't know about are thrown away.
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) return badFields(fieldErrorsFrom(parsed.error));
    const data = parsed.data;

    if (!isObjectIdString(data.categoryId)) return badFields({ categoryId: "Please choose a category." });

    const price = rupeesToPaise(data.price);
    if (price <= 0) return badFields({ price: "Price must be more than 0." });

    try {
        // 4) The pictures must really be in THIS cafe's ImageKit folder.
        if (!isOurPictureUrl(data.mainImage.url, session.cafeId)) {
            return badFields({ mainImage: "That picture is not valid. Please upload it again." });
        }
        if (data.secondImage && !isOurPictureUrl(data.secondImage.url, session.cafeId)) {
            return badFields({ secondImage: "That picture is not valid. Please upload it again." });
        }

        await connectDB();
        await Promise.all([Category.init(), MenuItem.init()]);

        // 5) The category must belong to THIS cafe.
        const category = await Category.findOne({ _id: data.categoryId, cafeId: session.cafeId }).select("_id").lean();
        if (!category) return badFields({ categoryId: "That category does not exist." });

        // 6) Save. cafeId always comes from the login, never from the request.
        const name = tidy(data.name);
        const last = await MenuItem.findOne({ cafeId: session.cafeId, categoryId: category._id })
            .sort({ sortOrder: -1 })
            .select("sortOrder")
            .lean();

        const item = await MenuItem.create({
            cafeId: session.cafeId,
            categoryId: category._id,
            name,
            nameKey: name.toLowerCase(),
            description: tidy(data.description),
            price,
            mainImage: { url: data.mainImage.url, fileId: data.mainImage.fileId },
            secondImage: data.secondImage ? { url: data.secondImage.url, fileId: data.secondImage.fileId } : undefined,
            sortOrder: (last?.sortOrder ?? 0) + 1,
        });

        return json({ ok: true, item: { id: String(item._id), name: item.name } }, 201);
    } catch (err) {
        if (err?.code === 11000) return badFields({ name: "An item with this name already exists in this category." }, 409);
        console.error("Create item error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}