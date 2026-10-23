import { Suspense } from "react";
import CategorySection from "./CategorySection";
import { getHomeCategories } from "@/lib/homeMenu";
import { getSession } from "@/lib/auth";


async function CategoriesContent() {
    // The first 6 categories with their items
    const [categories, session] = await Promise.all([getHomeCategories(6), getSession()]);
    if (categories.length === 0) return null;

    return (
        <div className="text-white mt-[5rem] sm:px-12 px-4 py-8 flex flex-col gap-15">
            <CategorySection categories={categories} canOrder={!session} />
        </div>
    );
}

export default function Categories() {
    return (
        <Suspense fallback={<div className="mt-[5rem] h-[40rem] animate-pulse bg-white/5 sm:mx-12 mx-4" />}>
            <CategoriesContent />
        </Suspense>
    );
}