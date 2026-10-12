import Hero from "@/components/home/hero"
import FeatureTasting from "@/components/home/featureTasting"
import SpecialityDesign from "@/components/home/specialityDesign"
import CocktailsDesign from "@/components/home/cocktailsDesign"
import Categories from "@/components/home/Categories"

export default function Home(){
    return(
        <>
            <Hero />
            <FeatureTasting />
            <SpecialityDesign />
            <CocktailsDesign />
            <Categories />
        </>
    )
}