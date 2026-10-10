import Nav from "@/components/nav/nav";

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

export default function GuestLayout({ children }) {
    return (
        <div className="w-full">
            <header>
                <Nav />
            </header>

            {children}
        </div>
    );
}