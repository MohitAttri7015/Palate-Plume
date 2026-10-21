import Hero from "@/components/home/hero"
import FeatureTasting from "@/components/home/featureTasting"
import SpecialityDesign from "@/components/home/specialityDesign"
import MocktailsDesign from "@/components/home/mocktailsDesign"
import Categories from "@/components/home/Categories"

export default function Home(){
    return(
        <>
            <Hero />
            <FeatureTasting />
            <SpecialityDesign />
            <MocktailsDesign />
            <Categories />
            
        </>
    )
}