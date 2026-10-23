import Nav from "@/components/nav/nav";
import Footer from "@/components/footer/footer"
import Hero from "@/components/home/hero"
import FeatureTasting from "@/components/home/featureTasting"
import SpecialityDesign from "@/components/home/specialityDesign"
import MocktailsDesign from "@/components/home/mocktailsDesign"
import Categories from "@/components/home/Categories"

import { Suspense } from 'react';
import { getSession } from "@/lib/auth"
import { getValidGuest } from "@/lib/guest"

async function NavbarWrapper() {
    const session = await getSession();
    const isGuest = await getValidGuest();
    return <Nav initialSession={session} isGuest={isGuest} />;
}

export default function Home() {
    return (
        <>
            <header>
                <Suspense fallback={<div></div>}>
                    <NavbarWrapper />
                </Suspense>
            </header>
            <Hero />
            <FeatureTasting />
            <SpecialityDesign />
            <MocktailsDesign />
            <Categories />
            <footer>
                <Footer />
            </footer>
        </>
    )
}