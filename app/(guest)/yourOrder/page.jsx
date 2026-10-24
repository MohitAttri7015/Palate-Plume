import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/config";
import { getValidGuest } from "@/lib/guest";
import { readCart } from "@/lib/tableCart";
import { formatRupees } from "@/lib/money";
import Order from "@/models/Order";

export const metadata = {
    title: { absolute: "Your order | Palate & Plume" },
    alternates: { canonical: "/yourOrder" },
    robots: { index: false },
};

// The servers run on UTC time, so we say which clock the cafe uses.
const TIME_ZONE = "Asia/Kolkata";
const timeOf = (date) =>
    new Date(date).toLocaleTimeString("en-IN", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });

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
    let tableIsFull = false;
    let loadError = false;

    try {
        const cart = await readCart(guest);

        if (cart.error) {
            tableIsFull = true;
        } else {
            await connectDB();
            await Order.init();

            orders = await Order.find({
                tableId: guest.tableId,
                sitting: cart.sitting,
            })
                .sort({ createdAt: 1 })
                .lean();
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

    if (orders.length === 0) {
        return (
            <Page table={guest.table}>
                <Nothing text="You have not placed an order yet." />
            </Page>
        );
    }

    const allTotal = orders.reduce(
        (sum, order) => sum + order.totalPaise,
        0
    );

    return (
        <Page table={guest.table}>
            <ol className="mt-10 flex flex-col gap-8">
                {orders.map((order, index) => (
                    <li key={String(order._id)} className="border-y border-white/10 py-5">
                        <div className="flex items-baseline justify-between">
                            <h2 className="font-heading text-2xl uppercase">
                                Order {index + 1}
                            </h2>
                            <span className="text-[12px] text-white/60">
                                {timeOf(order.createdAt)}
                            </span>
                        </div>

                        <ul className="mt-4 flex flex-col gap-2 text-[14px]">
                            {order.items.map((line) => (
                                <li key={String(line.itemId)} className="flex justify-between gap-4">
                                    <span>
                                        {line.qty} × {line.name}
                                    </span>
                                    <span className="shrink-0 text-white/70">
                                        {formatRupees(line.unitPaise * line.qty)}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-[13px]">
                            <span className="uppercase tracking-widest text-white/60">
                                Order total
                            </span>
                            <span>{formatRupees(order.totalPaise)}</span>
                        </div>
                    </li>
                ))}
            </ol>

            {orders.length > 1 && (
                <div className="mt-8 flex items-center justify-between">
                    <span className="text-[12px] uppercase tracking-widest text-white/60">
                        All orders
                    </span>
                    <span className="font-heading text-3xl">
                        {formatRupees(allTotal)}
                    </span>
                </div>
            )}

            <Link
                href="/menu"
                className="mt-10 block w-full border border-white py-4 text-center text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black"
            >
                Order more
            </Link>
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