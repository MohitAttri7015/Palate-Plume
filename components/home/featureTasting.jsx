import { Suspense } from "react";
import CustomSlider from "./CustomSlider";
import SliderSkeleton from "./SliderSkeleton";
import { getFeaturedFood } from "@/lib/homeMenu";

const HEADER_IMAGE =
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80";

async function FeatureTastingContent() {
    // 5 random food items (from different food categories), new picks on every visit
    const products = await getFeaturedFood(5);
    if (products.length === 0) return null;

    return (
        <div className="text-white mt-[5rem] sm:px-12 px-4 py-8 flex flex-col gap-15">
            <div className="flex gap-4 flex-row items-center">
                <span className="w-2 h-2 bg-white"></span>
                <p className="font-ui text-[12px] tracking-[5px] uppercase">FEATURED TASTING</p>
            </div>

            <CustomSlider
                headerImage={HEADER_IMAGE}
                headerTitle={<>AUTUMN<br />MENU 2026</>}
                headerButtonText="VIEW ALL"
                headerButtonLink="/menu"
                products={products}
                currency="₹"
            />
        </div>
    );
}

export default function FeatureTasting() {
    return (
        <Suspense fallback={<SliderSkeleton label="FEATURED TASTING" />}>
            <FeatureTastingContent />
        </Suspense>
    );
}