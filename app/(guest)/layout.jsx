import { Suspense } from 'react';
import { getSession } from "@/lib/auth"
import Nav from "@/components/nav/nav";
import Footer from "@/components/footer/footer"

export const metadata = {
    title: {
        absolute: "Palate & Plume – Culinary Artistry & Digital Menu",
    },
    description:
        "Experience fine dining at your rhythm. Browse our seasonal tasting menu, order artisanal dishes, and track kitchen updates directly from your table.",
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: {
            absolute: "Palate & Plume – Culinary Artistry & Digital Menu",
        },
        description:
            "Experience fine dining at your rhythm. Browse our seasonal tasting menu, order artisanal dishes, and track kitchen updates directly from your table.",
        url: "/",
        siteName: "Palate & Plume",
        type: "website",
    },
};


async function NavbarWrapper() {
    const session = await getSession();
    return <Nav initialSession={session} />;
}
export default function GuestLayout({ children }) {

    return (
        <div className="w-full">
            <header>
                <Suspense fallback={<div></div>}>
                    <NavbarWrapper />
                </Suspense>
            </header>

            {children}

            <footer>
                <Footer />
            </footer>

        </div>
    );
}