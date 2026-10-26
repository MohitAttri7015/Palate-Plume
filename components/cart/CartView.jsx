'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link'
import { X } from 'lucide-react'
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/cartStore';

// 14950 paise -> ₹149.50   (whole rupees show without decimals)
const rupees = (paise) =>
    `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export default function CartView({ tableNumber }) {
    const { items, setQty, remove, ready, atTable, tableFull, people, maxPeople, refresh } = useCart();
    const router = useRouter();
    const [placing, setPlacing] = useState(false);
    const placingRef = useRef(false);
    const [orderError, setOrderError] = useState('');

    // Names/prices come from the server. We ask again only when the SET of items changes, not on every + or -.
    const idsKey = items.map((i) => i.id).sort().join(',');
    const [quote, setQuote] = useState({ key: '', lines: {} });
    const [failedKey, setFailedKey] = useState('');
    const [removedNote, setRemovedNote] = useState(false);
    const [recheck, setRecheck] = useState(0); // goes up to ask the server about the items again

    useEffect(() => {
        if (!idsKey) return;
        const controller = new AbortController();
        fetch('/api/cart/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // qty is not needed for a price check, so a placeholder 1 is sent
            body: JSON.stringify({ items: idsKey.split(',').map((id) => ({ id, qty: 1 })) }),
            signal: controller.signal,
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error('quote failed'))))
            .then((data) => {
                setQuote({ key: idsKey, lines: Object.fromEntries(data.lines.map((l) => [l.id, l])) });
                if (data.unavailable.length > 0) {
                    data.unavailable.forEach(remove); // sold out or deleted: take it out of the cart
                    setRemovedNote(true);
                }
            })
            .catch((err) => {
                if (err?.name !== 'AbortError') setFailedKey(idsKey);
            });
        return () => controller.abort();
    }, [idsKey, remove, recheck]);

    const loading = idsKey !== '' && quote.key !== idsKey && failedKey !== idsKey;
    const failed = idsKey !== '' && failedKey === idsKey;
    const totalPaise = items.reduce((sum, i) => sum + (quote.lines[i.id]?.unitPaise ?? 0) * i.qty, 0);

    // The order button only works for a phone that sits at a table, once the prices have loaded.
    const canOrder = atTable && !tableFull && !loading && !failed && items.length > 0 && !placing;

    async function placeOrder() {
        if (placingRef.current) return;
        placingRef.current = true;
        setPlacing(true);
        setOrderError('');
        if (data.code === 'ITEM_UNAVAILABLE') setRecheck((n) => n + 1); // something just sold out: find it and remove it
        try {
            const res = await fetch('/api/orders', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setOrderError(data.error || 'We could not place your order. Please try again.');
                await refresh();
                return;
            }
            await refresh(); // the cart is empty now, on every phone at the table
            router.push('/yourOrder');
        } catch {
            setOrderError('No connection. Please try again.');
        } finally {
            // Always switch "Placing..." off. Next.js keeps this page alive in the background
            // when you open /yourOrder, so without this it still said "Placing..." on coming back.
            placingRef.current = false;
            setPlacing(false);
        }
    }

    return (
        <main className="min-h-screen px-4 py-8 font-ui text-white sm:px-12">
            <div className="mx-auto max-w-2xl">
                <div className="flex flex-row justify-between">
                    <h1 className="font-heading text-5xl sm:text-6xl">Your cart</h1>

                    <Link
                        href="/"
                        aria-label="Close the menu"
                        className="relative flex cursor-pointer shrink-0 items-center justify-center border border-[#26262E] rounded-full p-2 h-fit"
                    >
                        <X size={20} strokeWidth={1.75} nonScalingStroke className="text-white" />
                    </Link>
                </div>

                {/* Which table this phone is at (from the QR code). */}
                <p className="mt-4 text-[12px] tracking-wide text-white/60">
                    {tableNumber ? `Table ${tableNumber}` : 'Scan the QR code on your table to place an order.'}
                    {atTable && people > 1 && ` · ${people} of ${maxPeople} people here, this cart is shared`}
                </p>

                {tableFull && (
                    <p role="alert" className="mt-6 border border-red-400/40 px-4 py-3 text-[12px] text-red-200">
                        This table already has {maxPeople} people. Please ask a member of our team for help.
                    </p>
                )}

                {removedNote && (
                    <p role="status" className="mt-6 border border-white/20 px-4 py-3 text-[12px] text-white/80">
                        Some items are no longer available and were removed from your cart.
                    </p>
                )}

                {!ready ? (
                    <div aria-hidden="true" className="mt-16 h-24 animate-pulse bg-white/5" />
                ) : items.length === 0 ? (
                    <div className="mt-16 flex flex-col items-start gap-6">
                        <p className="text-sm text-white/60">Your cart is empty.</p>
                        <Link href="/menu" className="border border-white px-10 py-3 text-[12px] uppercase tracking-[1px] transition-colors duration-500 hover:bg-white hover:text-black">
                            Browse the menu
                        </Link>
                    </div>
                ) : (
                    <>
                        {failed && (
                            <p role="alert" className="mt-6 border border-red-400/40 px-4 py-3 text-[12px] text-red-200">
                                Could not load the item details. Please refresh the page.
                            </p>
                        )}

                        <ul className="mt-10 flex flex-col divide-y divide-white/10 border-y border-white/10">
                            {items.map((item) => {
                                const info = quote.lines[item.id];
                                if (!info) {
                                    // still loading this one: a grey placeholder row, never a blank gap
                                    return <li key={item.id} aria-hidden="true" className="h-24 animate-pulse bg-white/5" />;
                                }
                                return (
                                    <li key={item.id} className="flex items-center gap-4 py-4">
                                        <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#16161A]">
                                            <Image src={info.image} alt="" fill sizes="80px" className="object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-heading text-lg uppercase leading-tight">{info.name}</p>
                                            <p className="mt-0.5 text-[12px] italic text-white/50">{info.category}</p>
                                            <p className="mt-2 text-[13px]">{rupees(info.unitPaise * item.qty)}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button type="button" aria-label={`Fewer ${info.name}`} onClick={() => setQty(item.id, item.qty - 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 hover:border-white">
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-5 text-center text-sm" aria-live="polite">{item.qty}</span>
                                            <button type="button" aria-label={`More ${info.name}`} onClick={() => setQty(item.id, item.qty + 1)} disabled={item.qty >= 20} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 hover:border-white disabled:cursor-not-allowed disabled:opacity-40">
                                                <Plus size={14} />
                                            </button>
                                            <button type="button" aria-label={`Remove ${info.name}`} onClick={() => remove(item.id)} className="ml-1 flex h-8 w-8 cursor-pointer items-center justify-center text-white/50 hover:text-white">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-8 flex items-center justify-between">
                            <span className="text-[12px] uppercase tracking-widest text-white/60">Total</span>
                            <span className="font-heading text-3xl">{loading ? '...' : rupees(totalPaise)}</span>
                        </div>


                        {orderError && (
                            <p role="alert" className="mt-6 border border-red-400/40 px-4 py-3 text-[12px] text-red-200">
                                {orderError}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={placeOrder}
                            disabled={!canOrder}
                            className={`mt-8 w-full border py-4 text-[12px] uppercase tracking-[1px] transition-colors duration-500 ${canOrder
                                ? 'cursor-pointer border-white text-white hover:bg-white hover:text-black'
                                : 'cursor-not-allowed border-white/30 text-white/50'
                                }`}
                        >
                            {placing ? 'Placing your order...' : 'Place order'}
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}