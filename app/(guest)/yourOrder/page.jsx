import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/config";
import { getValidGuest } from "@/lib/guest";
import { readCart } from "@/lib/tableCart";
import { ordersForSitting, shapeOrder, stampOf } from "@/lib/orders";
import YourOrders from "@/components/orders/YourOrders";


export const metadata = {
    title: { absolute: "Your order | Palate & Plume" },
    alternates: { canonical: "/yourOrder" },
    robots: { index: false },
};



// The frame around everything (same look as the cart page).
function Page({ table, children }) {
    return (
        <main className="min-h-screen px-4 py-8 font-ui text-white sm:px-12">
            <div className="mx-auto max-w-2xl">
                <div className="flex flex-row justify-between">
                    <h1 className="font-heading text-5xl sm:text-6xl">Your order</h1>
                    <Link
                        href="/"
                        aria-label="Close"
                        className="relative flex h-fit shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#26262E] p-2"
                    >
                        <X size={20} strokeWidth={1.75} className="text-white" />
                    </Link>
                </div>
                {table && <p className="mt-4 text-[12px] tracking-wide text-white/60">Table {table}</p>}
                {children}
            </div>
        </main>
    );
}

function Nothing({ text, button = "Browse the menu" }) {
    return (
        <div className="mt-16 flex flex-col items-start gap-6">
            <p className="text-sm text-white/60">{text}</p>
            <Link
                href="/menu"
                className="border border-white px-10 py-3 text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black"
            >
                {button}
            </Link>
        </div>
    );
}


async function OrderContent() {
    const session = await getSession();
    if (session) redirect(homeFor(session.role));

    const guest = await getValidGuest();

    if (!guest) {
        return (
            <Page>
                <Nothing text="Scan the QR code on your table to see your orders." />
            </Page>
        );
    }

    let orders;
    let sitting = '';
    let tableIsFull = false;
    let loadError = false;

    try {
        const cart = await readCart(guest);

        if (cart.error) {
            tableIsFull = true;
        } else {
            sitting = cart.sitting;
            orders = await ordersForSitting(guest, cart.sitting);
        }
    } catch (err) {
        console.error("Your order page error:", err);
        loadError = true;
    }

    if (tableIsFull) {
        return (
            <Page table={guest.table}>
                <Nothing text="This table is full right now. Please ask a member of our team for help." />
            </Page>
        );
    }

    if (loadError) {
        return (
            <Page table={guest.table}>
                <Nothing text="We could not load your orders. Please refresh the page." />
            </Page>
        );
    }

    // Always show the live list, even when it is empty: someone else at the table may order while this page is open.
    return (
        <Page table={guest.table}>
            <YourOrders initialOrders={orders.map(shapeOrder)} initialStamp={stampOf(orders)} table={guest.table} sitting={sitting} />
        </Page>
    );
}


export default function YourOrderPage() {
    return (
        <Suspense fallback={<main className="min-h-screen" />}>
            <OrderContent />
        </Suspense>
    );
}