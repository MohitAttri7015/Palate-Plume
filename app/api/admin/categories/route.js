import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { categorySchema, tidy } from "@/lib/validation";
import Category from "@/models/Category";
import { requireAdmin } from "@/lib/requireAdmin";


const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Create a category. The browser sends: { "name": "Coffee" }
export async function POST(request) {

    const { session, error } = await requireAdmin();
    if (error) return error;
    
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: "Please enter a category name." }, 400);
    }

    // 3) Check it follows the rules.
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
        const issue = parsed.error.issues[0];
        // "invalid_type" means the name was missing or not text: give the same friendly message.
        const friendly = issue?.code === "invalid_type" ? "Please enter a category name." : issue?.message;
        return json({ error: friendly || "Please enter a category name." }, 400);
    }
    const name = tidy(parsed.data.name);

    // 4) Save it.
    try {
        await connectDB();
        await Category.init(); // makes sure the "no duplicates" rule exists in the database

        const last = await Category.findOne({ cafeId: session.cafeId }).sort({ sortOrder: -1 }).select("sortOrder").lean();
        const category = await Category.create({
            cafeId: session.cafeId, // always comes from the login, never from the request
            name,
            nameKey: name.toLowerCase(),
            sortOrder: (last?.sortOrder ?? 0) + 1, // new category goes to the end of the list
        });

        return json({ ok: true, category: { id: String(category._id), name: category.name } }, 201);
    } catch (err) {
        if (err?.code === 11000) return json({ error: "That category already exists." }, 409);
        console.error("Create category error:", err);
        return json({ error: "Something went wrong on our side. Please try again." }, 500);
    }
}