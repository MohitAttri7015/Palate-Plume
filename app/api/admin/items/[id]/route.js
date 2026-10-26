// PATCH /api/admin/items/<id>  (admin only)
//   { "isAvailable": false }            -> the "Sold out" switch
//   { name, categoryId, description, price, mainImage?, secondImage? }  -> edit the item
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { editItemSchema, availabilitySchema, fieldErrorsFrom, isObjectIdString, tidy } from "@/lib/validation";
import { rupeesToPaise } from "@/lib/money";
import { isOurPictureUrl } from "@/lib/pictureUrl";
import { deleteImageKitFile } from "@/lib/imagekit";
import { adminItem } from "@/lib/menuAdmin";
import Category from "@/models/Category";
import MenuItem from "@/models/MenuItem";
import { requireAdmin } from "@/lib/requireAdmin";

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const badFields = (fieldErrors, status = 400) => json({ error: "Please fix the highlighted fields.", fieldErrors }, status);

export async function PATCH(request, { params }) {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    if (!isObjectIdString(id)) return json({ error: "That item does not exist." }, 404);

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Bad request." }, 400);
    }

    try {
        await connectDB();

        /* ───── The "Sold out" switch ───── */
        const isSwitch = body && typeof body === "object" && Object.keys(body).length === 1 && "isAvailable" in body;
        if (isSwitch) {
            const parsedSwitch = availabilitySchema.safeParse(body);
            if (!parsedSwitch.success) return json({ error: "Bad request." }, 400);
            // cafeId comes from the login, so an admin can only change their own cafe's items
            const item = await MenuItem.findOneAndUpdate(
                { _id: id, cafeId: session.cafeId },
                { $set: { isAvailable: parsedSwitch.data.isAvailable } },
                { returnDocument: "after" }
            )
                .select("isAvailable")
                .lean();
            if (!item) return json({ error: "That item does not exist." }, 404);
            return json({ ok: true, isAvailable: item.isAvailable !== false });
        }

        /* ───── Editing the item ───── */
        const parsed = editItemSchema.safeParse(body);
        if (!parsed.success) return badFields(fieldErrorsFrom(parsed.error));
        const data = parsed.data;
        if (!isObjectIdString(data.categoryId)) return badFields({ categoryId: "Please choose a category." });

        const price = rupeesToPaise(data.price);
        if (price <= 0) return badFields({ price: "Price must be more than 0." });

        // New pictures must really be in THIS cafe's ImageKit folder.
        if (data.mainImage && !isOurPictureUrl(data.mainImage.url, session.cafeId)) {
            return badFields({ mainImage: "That picture is not valid. Please upload it again." });
        }
        if (data.secondImage && !isOurPictureUrl(data.secondImage.url, session.cafeId)) {
            return badFields({ secondImage: "That picture is not valid. Please upload it again." });
        }

        await MenuItem.init();
        const [old, category] = await Promise.all([
            MenuItem.findOne({ _id: id, cafeId: session.cafeId }).lean(),
            Category.findOne({ _id: data.categoryId, cafeId: session.cafeId }).select("_id").lean(),
        ]);
        if (!old) return json({ error: "That item does not exist." }, 404);
        if (!category) return badFields({ categoryId: "That category does not exist." });

        const name = tidy(data.name);
        const $set = {
            name,
            nameKey: name.toLowerCase(),
            description: tidy(data.description),
            price,
            categoryId: category._id,
        };
        if (data.mainImage) $set.mainImage = { url: data.mainImage.url, fileId: data.mainImage.fileId };
        if (data.secondImage) $set.secondImage = { url: data.secondImage.url, fileId: data.secondImage.fileId };

        // Moved to another category: it goes to the end of that category.
        if (String(old.categoryId) !== String(category._id)) {
            const last = await MenuItem.findOne({ cafeId: session.cafeId, categoryId: category._id })
                .sort({ sortOrder: -1 })
                .select("sortOrder")
                .lean();
            $set.sortOrder = (last?.sortOrder ?? 0) + 1;
        }

        const saved = await MenuItem.findOneAndUpdate({ _id: id, cafeId: session.cafeId }, { $set }, { returnDocument: "after" }).lean();
        if (!saved) return json({ error: "That item does not exist." }, 404);

        // The old pictures are no longer used: remove them from ImageKit (a failure here is ignored).
        const leftovers = [];
        if (data.mainImage && old.mainImage?.fileId && old.mainImage.fileId !== data.mainImage.fileId) leftovers.push(old.mainImage.fileId);
        if (data.secondImage && old.secondImage?.fileId && old.secondImage.fileId !== data.secondImage.fileId) leftovers.push(old.secondImage.fileId);
        await Promise.all(leftovers.map(deleteImageKitFile));

        return json({ ok: true, item: adminItem(saved) });
    } catch (err) {
        if (err?.code === 11000) return badFields({ name: "An item with this name already exists in this category." }, 409);
        console.error("Edit item error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}