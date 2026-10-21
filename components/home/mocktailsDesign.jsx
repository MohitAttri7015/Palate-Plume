import { Suspense } from "react";
import CustomSlider from "./CustomSlider";
import SliderSkeleton from "./SliderSkeleton";
import { getMocktailItems } from "@/lib/homeMenu";

const HEADER_IMAGE =
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80";

async function MocktailsContent() {
    // Only items from the mocktail categories (see MOCKTAIL_CATEGORIES in lib/homeMenuLogic.js)
    const products = await getMocktailItems();
    if (products.length === 0) return null;

    return (
        <div className="text-white mt-[5rem] sm:px-12 px-4 py-8 flex flex-col gap-15">
            <div className="flex gap-4 flex-row items-center">
                <span className="w-2 h-2 bg-white"></span>
                <p className="font-ui text-[12px] tracking-[5px] uppercase">Craft Mocktails</p>
            </div>

            <CustomSlider
                headerImage={HEADER_IMAGE}
                headerTitle={<>OUR BEST<br />MOCKTAILS</>}
                headerButtonText="VIEW ALL"
                headerButtonLink="/menu"
                products={products}
                currency="₹"
            />
        </div>
    );
}

export default function MocktailsDesign() {
    return (
        <Suspense fallback={<SliderSkeleton label="Craft Cocktails" />}>
            <MocktailsContent />
        </Suspense>
    );
}