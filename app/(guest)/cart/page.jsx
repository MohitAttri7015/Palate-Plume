import { Suspense } from "react";
import CartView from "@/components/cart/CartView";
import { getValidGuest } from "@/lib/guest";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/config";

export const metadata = {
    title: { absolute: "Your cart | Palate & Plume" },
    alternates: { canonical: "/cart" },
    robots: { index: false },
};

async function CartContent() {
    const session = await getSession();
    if (session) redirect(homeFor(session.role));
    
    // Which table is this phone at? (null = nobody scanned a table QR code, or it is no longer valid)
    const guest = await getValidGuest();
    return <CartView tableNumber={guest?.table ?? null} />;
}

export default function CartPage() {
    return (
        <Suspense fallback={<main className="min-h-screen" />}>
            <CartContent />
        </Suspense>
    );
}